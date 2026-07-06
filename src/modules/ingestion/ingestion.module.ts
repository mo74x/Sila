import { Module } from '@nestjs/common';
import { IngestionController } from './controllers/ingestion.controller';
import { IngestionService } from './services/ingestion.service';
import { KafkaModule } from '../../core/kafka/kafka.module';

@Module({
  imports: [KafkaModule],
  controllers: [IngestionController],
  providers: [IngestionService],
})
export class IngestionModule {}
