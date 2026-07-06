import { Module } from '@nestjs/common';
import { LedgerService } from './services/ledger.service';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class StateMachineModule {}
