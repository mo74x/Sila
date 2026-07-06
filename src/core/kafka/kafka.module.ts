import { Module, Global } from '@nestjs/common';
import { KafkaProducerService } from './kafka.service';

@Global()
@Module({
  providers: [KafkaProducerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
