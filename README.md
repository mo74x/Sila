# Sila Gateway

> **A multi-tenant, AI-powered ERP synchronization gateway for the Egyptian market.**  
> Bridges WhatsApp voice notes → LLM extraction → ETA e-invoice submission, all secured with on-premise USB token signing.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Module Breakdown](#module-breakdown)
- [Signer Bridge Client Agent](#signer-bridge-client-agent)
- [Tech Stack](#tech-stack)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)

---

## Overview

Sila Gateway is a NestJS-based microservice that powers a multi-tenant logistics platform. It ingests unstructured driver voice notes from WhatsApp, uses an LLM to extract structured transaction data, and submits legally compliant e-invoices to Egypt's **ETA (Egyptian Tax Authority)** portal — signed with a physical USB token.

```
Driver WhatsApp Message
        │
        ▼
  Ingestion Module  ──(Kafka)──▶  Intelligence Module
  (Webhook / STT)               (GPT-4o + JSON Repair)
                                        │
                                        ▼
                                  ERP Bridge Module
                              (Serialize → Hash → Sign → Submit)
                                        │
                              ┌─────────┴──────────┐
                              ▼                    ▼
                      Signer Bridge          ETA API Portal
                    (On-premise USB)    (api.invoicing.eta.gov.eg)
```

---

## Architecture

The system is split into two runtime environments:

### 1. Cloud Gateway (`sila-gateway`)
A NestJS application hosted in the cloud that:
- Receives WhatsApp webhooks and routes them per tenant via Kafka
- Runs LLM extraction and JSON repair on raw driver messages
- Manages the ERP outbox/ledger in MongoDB (one DB per tenant)
- Coordinates remote signing via WebSocket with on-premise agents

### 2. On-Premise Agent (`client-agents/signer-bridge`)
A lightweight Node.js process installed at the **tenant's physical office** that:
- Holds the USB HSM token (EgyptTrust ePass2003)
- Connects to the cloud gateway via WebSocket
- Signs document hashes on demand using PKCS#11 (CAdES format)
- Never exposes the private key outside the local machine

```
┌─────────────────────────────────────────────────┐
│                  Cloud (Sila Gateway)           │
│                                                 │
│  Webhook ──▶ Kafka ──▶ Intelligence ──▶ ERP     │
│                                     Bridge ◀──┐ │
│                                  (WebSocket)  │ │
└───────────────────────────────────────────────┼─┘
                                                │  WebSocket (wss://)
┌───────────────────────────────────────────────┼─┐
│               Tenant Office (On-Premise)      │ │
│                                               │ │
│  signer-bridge ──▶ pkcs11 ──▶ USB Token ──────┘ │
│   (bridge.js)      (PKCS#11)   ePass2003        │
└─────────────────────────────────────────────────┘
```

---

## Module Breakdown

| Module | Path | Responsibility |
|---|---|---|
| **Ingestion** | `src/modules/ingestion/` | Receives WhatsApp webhooks, validates tenant context, publishes to Kafka |
| **Intelligence** | `src/modules/intelligence/` | Consumes Kafka events, calls GPT-4o, repairs/validates LLM JSON output, writes to ERP outbox |
| **ERP Bridge** | `src/modules/erp-bridge/` | Consumes outbox events, serializes documents per ETA spec, requests CAdES signature, submits to ETA API |
| **State Machine** | `src/modules/state-machine/` | Manages invoice lifecycle state transitions |
| **Tenant** | `src/modules/tenant/` | Multi-tenant bootstrapping, MongoDB database routing |
| **Core** | `src/core/` | Shared middleware (tenant resolution), interceptors, interfaces |

### Data Flow — Intelligence Pipeline

```
Kafka Event (tenant.{id}.whatsapp.ingest)
        │
        ▼
IntelligenceController
        │
        ▼
ExtractionService.processUnstructuredText()
  ├── OpenAI GPT-4o  →  raw JSON string
  └── RepairService.sanitizeAndParse()
        └── safeParseAI()  →  validates against Zod schema
                │
                ▼
         TransactionIntent
    { amount, currency, itemRef, intent }
                │
                ▼
    MongoDB: tenant_{id}.erp_outbox  (status: PENDING_ERP_SYNC)
```

### Data Flow — ERP Bridge & Signing

```
Kafka Event (tenant.{id}.erp.outbox)
        │
        ▼
AclWorkerController
        │
        ▼
EtaApiService.submitInvoice()
  ├── serializeEtaDocument()  →  canonical string (ETA spec)
  ├── SHA-256 hash
  ├── SignerBridgeGateway.requestCadesSignature()
  │     └── WebSocket emit('SIGN_HASH') ──▶ on-premise signer-bridge
  │           └── PKCS#11 sign ──▶ base64 CAdES signature
  └── POST /api/v1.0/documentsubmissions  →  ETA Portal
```

---

## Signer Bridge Client Agent

Located in `client-agents/signer-bridge/`. This is the on-premise Node.js agent that physically controls the USB token.

### Prerequisites

- Windows machine with an **EgyptTrust ePass2003** USB token inserted
- The PKCS#11 driver DLL installed (default: `C:\Windows\System32\eps2003csp11.dll`)
- Node.js ≥ 18 + Python 3.12 + Visual Studio Build Tools (required to compile `graphene-pk11`)

### Setup

```bash
cd client-agents/signer-bridge
cp .env.example .env
# Fill in your TENANT_ID, TOKEN_PIN, and CLOUD_WS_URL
npm install
node bridge.js
```

### Environment Variables

```env
TENANT_ID=your-tenant-uuid
CLOUD_WS_URL=wss://api.sila.dev
TOKEN_PIN=123456
DLL_PATH=C:\Windows\System32\eps2003csp11.dll
```

### How It Works

1. On start, `bridge.js` loads the PKCS#11 module and authenticates with the USB token PIN
2. It connects to the cloud gateway via WebSocket and joins the room `tenant_bridge_{TENANT_ID}`
3. When the cloud emits a `SIGN_HASH` event, the agent signs the hash using the token's private key
4. The CAdES signature (base64) is returned to the cloud via Socket.IO acknowledgement callback
5. On `SIGINT` (Ctrl+C), the session is logged out and the PKCS#11 module is finalized cleanly

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v24, NestJS v11 |
| Language | TypeScript |
| Message Broker | Apache Kafka (`kafkajs`) |
| Database | MongoDB (per-tenant database isolation) |
| AI / LLM | OpenAI GPT-4o |
| JSON Validation | `agentic-json-repair` + Zod |
| Real-time | Socket.IO (WebSocket) |
| Cryptography | PKCS#11 via `graphene-pk11` (on-premise only) |
| E-Invoice Target | Egypt ETA API v1.0 |

---

## Environment Variables

Create a `.env` file in the project root:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# MongoDB
MONGO_BASE_URI=mongodb://localhost:27017

# Kafka
KAFKA_BROKER=localhost:9092
```

---

## Getting Started

### Cloud Gateway

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Lint
npm run lint

# Tests
npm run test
npm run test:e2e
npm run test:cov
```

---

## Project Structure

```
sila-gateway/
├── src/
│   ├── core/                          # Shared infrastructure
│   │   ├── interceptors/              # Error formatting
│   │   ├── interfaces/                # Shared TypeScript interfaces
│   │   └── middleware/                # Tenant resolution middleware
│   ├── modules/
│   │   ├── ingestion/                 # WhatsApp webhook → Kafka
│   │   │   ├── controllers/           # Webhook endpoints
│   │   │   └── services/             # Repair + sanitize LLM output
│   │   ├── intelligence/              # Kafka → GPT-4o → ERP outbox
│   │   │   ├── controllers/           # Kafka consumer (regex topic pattern)
│   │   │   └── services/             # Extraction + repair
│   │   ├── erp-bridge/               # ERP outbox → ETA API submission
│   │   │   ├── gateways/             # WebSocket bridge to signer agent
│   │   │   ├── services/             # ETA serialization + API client
│   │   │   └── workers/              # Kafka ACL worker (outbox consumer)
│   │   ├── state-machine/            # Invoice lifecycle management
│   │   └── tenant/                   # Tenant provisioning & DB routing
│   ├── core.module.ts
│   └── main.ts
│
└── client-agents/
    └── signer-bridge/                 # On-premise USB token agent
        ├── bridge.js                  # Main agent script
        ├── .env.example
        └── package.json
```
