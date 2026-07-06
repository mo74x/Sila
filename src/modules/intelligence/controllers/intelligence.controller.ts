/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Logger } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Ctx,
  KafkaContext,
} from '@nestjs/microservices';
import { ExtractionService } from '../services/extraction.service';
import { MongoClient } from 'mongodb';

@Controller()
export class IntelligenceController {
  private readonly logger = new Logger(IntelligenceController.name);
  private mongoClient: MongoClient;

  constructor(private readonly extractionService: ExtractionService) {
    // Initialize a global worker pool for the consumers
    this.mongoClient = new MongoClient(process.env.MONGO_BASE_URI || '');
  }

  // Use Regex to consume ALL tenant ingestion topics at scale
  @EventPattern(new RegExp('^tenant\\..*\\.whatsapp\\.ingest$'))
  async handleIncomingWhatsAppEvent(
    @Payload() message: any,
    @Ctx() context: KafkaContext,
  ) {
    const topic = context.getTopic();
    const tenantId = message.tenantId; // Extracted directly from the Kafka payload

    this.logger.log(
      `Worker processing event for [${tenantId}] from topic [${topic}]`,
    );

    try {
      // 1. Handle STT (Speech to text) if message.type === 'audio'
      const transcribedText =
        message.text || 'Dropped off 15 cartons, took 3000 EGP.';

      // 2. Extract and Repair via LLM
      const structuredData =
        await this.extractionService.processUnstructuredText(transcribedText);

      // 3. Manual Database Routing (Since we lack HTTP Scope.REQUEST here)
      const tenantDb = this.mongoClient.db(`tenant_${tenantId}`);

      // 4. Update the ACID Ledger / Outbox
      await tenantDb.collection('erp_outbox').insertOne({
        status: 'PENDING_ERP_SYNC',
        payload: structuredData,
        createdAt: new Date(),
      });

      this.logger.log(`Successfully queued ledger update for ${tenantId}`);
    } catch (error) {
      this.logger.error(`Pipeline failure for ${tenantId}`, error);
      // Implement dead-letter queue (DLQ) logic here
    }
  }
}
