import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, RecordMetadata } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private isConnected = false;

  async onModuleInit() {
    const broker = process.env.KAFKA_BROKER ?? 'localhost:9092';
    this.logger.log(`Initializing Kafka connection to broker: ${broker}`);
    
    try {
      this.kafka = new Kafka({
        clientId: 'sila-gateway-producer',
        brokers: [broker],
      });
      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka Producer connected successfully');
    } catch (err: any) {
      this.logger.warn(`Failed to connect Kafka Producer. Outgoing messages will be logged only. Error: ${err.message}`);
    }
  }

  async send(tenantId: string, topic: string, message: any): Promise<RecordMetadata[] | null> {
    const prefixedTopic = `${tenantId}-${topic}`;
    this.logger.log(`Publishing to Kafka [Topic: ${prefixedTopic}]: ${JSON.stringify(message)}`);

    if (!this.isConnected || !this.producer) {
      this.logger.warn(`Kafka producer not connected. Simulating publish to topic: ${prefixedTopic}`);
      return null;
    }

    try {
      return await this.producer.send({
        topic: prefixedTopic,
        messages: [
          {
            value: JSON.stringify(message),
            headers: { 'x-tenant-id': tenantId },
          },
        ],
      });
    } catch (err: any) {
      this.logger.error(`Failed to publish message to topic ${prefixedTopic}`, err);
      throw err;
    }
  }

  async onModuleDestroy() {
    if (this.producer && this.isConnected) {
      this.logger.log('Disconnecting Kafka Producer...');
      await this.producer.disconnect();
    }
  }
}
