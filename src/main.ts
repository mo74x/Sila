import { NestFactory } from '@nestjs/core';
import { CoreModule } from './core.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(CoreModule);

  // Connect the Kafka Microservice consumer
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        clientId: 'sila-intelligence-worker',
      },
      consumer: {
        groupId: 'sila-whatsapp-consumers',
      },
    },
  });

  // Start both HTTP and Kafka listeners
  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3000);
  console.log(`Sila Gateway running on port ${process.env.PORT || 3000}`);
}
void bootstrap();
