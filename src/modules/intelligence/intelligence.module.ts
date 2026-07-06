import { Module } from '@nestjs/common';
import { SttService } from './services/stt.service';
import { ExtractionService } from './services/extraction.service';
import { RepairService } from './services/repair.service';

@Module({
  providers: [SttService, ExtractionService, RepairService],
  exports: [SttService, ExtractionService, RepairService],
})
export class IntelligenceModule {}
