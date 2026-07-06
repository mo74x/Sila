/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { SignerBridgeGateway } from '../gateways/signer-bridge.gateway';

@Injectable()
export class EtaApiService {
  constructor(private readonly signerGateway: SignerBridgeGateway) {}

  private serializeEtaDocument(document: any): string {
    let serialized = '';
    const keys = Object.keys(document).sort();

    for (const key of keys) {
      const value = document[key];
      if (typeof value === 'object' && value !== null) {
        serialized += `"${key.toUpperCase()}"${this.serializeEtaDocument(value)}`;
      } else {
        serialized += `"${key.toUpperCase()}""${value}"`;
      }
    }
    return serialized;
  }

  async submitInvoice(tenantId: string, erpPayload: any) {
    const canonicalString = this.serializeEtaDocument(erpPayload);
    const documentHash = createHash('sha256')
      .update(canonicalString, 'utf8')
      .digest('hex');

    const signature = await this.signerGateway.requestCadesSignature(
      tenantId,
      documentHash,
    );

    const finalPayload = {
      documents: [
        {
          ...erpPayload,
          signatures: [
            {
              signatureType: 'I',
              value: signature,
            },
          ],
        },
      ],
    };

    const token = await this.getAccessToken(tenantId);

    const response = await fetch(
      'https://api.invoicing.eta.gov.eg/api/v1.0/documentsubmissions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload),
      },
    );

    if (!response.ok) {
      throw new Error(`ETA_REJECTED_${response.status}`);
    }

    return response.json();
  }

  private async getAccessToken(tenantId: string): Promise<string> {
    return 'mock_oauth_token';
  }
}
