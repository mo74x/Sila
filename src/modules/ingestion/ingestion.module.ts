import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { WebhookController } from './controllers/webhook.controller';
import { IngestionService } from './services/ingestion.service';
import { TenantKafkaProducer } from '../../core/kafka/tenant-kafka.producer';

@Module({
  imports: [
    // Register the Kafka Client
    ClientsModule.register([
      {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'sila-gateway',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
          },
          producer: {
            allowAutoTopicCreation: true,
          },
        },
      },
    ]),
  ],
  controllers: [WebhookController],
  providers: [IngestionService, TenantKafkaProducer],
})
export class IngestionModule {}
