import { Injectable, Logger } from '@nestjs/common';
import { safeParseAI } from 'agentic-json-repair';
import { z } from 'zod';

@Injectable()
export class RepairService {
  private readonly logger = new Logger(RepairService.name);

  repairJson(corruptedJson: string, schema?: z.ZodType<any>): any {
    this.logger.log('Repairing JSON string using agentic-json-repair');
    
    const targetSchema = schema || z.record(z.any());
    const result = safeParseAI(corruptedJson, targetSchema);

    if (result.success) {
      return result.data;
    } else {
      this.logger.error(`JSON repair/validation failed. Error: ${result.error}`);
      throw new Error(`JSON repair failed: ${result.error}`);
    }
  }
}
