import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from '../../../core/kafka/kafka.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly processedMessages = new Set<string>();

  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  async processWebhook(tenantId: string, payload: any): Promise<{ success: boolean }> {
    this.logger.log(`Processing webhook event for tenant: ${tenantId}`);

    const messageId = this.extractMessageId(payload);
    
    if (messageId && this.processedMessages.has(messageId)) {
      this.logger.warn(`Ignored duplicate message payload: ${messageId}`);
      return { success: true };
    }

    if (messageId) {
      this.processedMessages.add(messageId);
    }

    await this.kafkaProducer.send(tenantId, 'whatsapp-ingested', payload);

    return { success: true };
  }

  private extractMessageId(payload: any): string | null {
    try {
      return payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id || null;
    } catch {
      return null;
    }
  }
}
