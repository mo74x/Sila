/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EtaApiService } from '../services/eta-api.service';
import { MongoClient, ObjectId } from 'mongodb';

@Controller()
export class AclWorkerController {
  private mongoClient: MongoClient;

  constructor(private readonly etaApiService: EtaApiService) {
    this.mongoClient = new MongoClient(process.env.MONGO_BASE_URI as string);
  }

  @EventPattern(new RegExp('^tenant\\..*\\.erp\\.outbox$'))
  async handleOutboxEvent(@Payload() message: any) {
    const { tenantId, outboxId, payload } = message;

    try {
      const etaResponse = await this.etaApiService.submitInvoice(
        tenantId,
        payload,
      );

      const db = this.mongoClient.db(`tenant_${tenantId}`);
      await db
        .collection('erp_outbox')
        .updateOne(
          { _id: new ObjectId(outboxId as string) },
          { $set: { status: 'SYNCED', syncRef: etaResponse.submissionId } },
        );
    } catch (error: any) {
      const db = this.mongoClient.db(`tenant_${tenantId}`);
      await db
        .collection('erp_outbox')
        .updateOne(
          { _id: new ObjectId(outboxId as string) },
          { $set: { status: 'FAILED', errorReason: error.message } },
        );
    }
  }
}
