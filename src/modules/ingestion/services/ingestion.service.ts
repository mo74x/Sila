/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable, Logger } from '@nestjs/common';
import { TenantKafkaProducer } from '../../../core/kafka/tenant-kafka.producer';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(private readonly kafkaProducer: TenantKafkaProducer) {}

  async processWebhookEvent(body: any) {
    try {
      // 1. Safely extract the entry array (Meta batches events sometimes)
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          const value = change.value;
          const messages = value.messages || [];

          for (const message of messages) {
            // 2. We have successfully found a message.
            // In a production app, we would check a Redis cache here for idempotency
            // using message.id to ensure we don't process it twice.

            this.logger.log(
              `Received message [${message.id}] of type [${message.type}]`,
            );

            // 3. Publish to Kafka immediately
            this.kafkaProducer.emitWhatsappEvent({
              messageId: message.id,
              from: message.from,
              type: message.type,
              text: message.text?.body,
              audio: message.audio, // Contains the media ID to download the voice note later
              timestamp: message.timestamp,
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to process Meta webhook payload', error);
      // We do not throw the error because we MUST return a 200 OK to Meta regardless
    }
  }
}
