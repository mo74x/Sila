import { Injectable, Logger } from '@nestjs/common';
import { safeParseAI } from 'agentic-json-repair';
import { z } from 'zod';

export interface TransactionIntent {
  amount: number | null;
  currency: string;
  itemRef: string | null;
  intent: 'CREDIT' | 'DEBIT' | 'RETURN' | 'UNKNOWN';
}

const TransactionIntentSchema = z.object({
  amount: z.number().nullable(),
  currency: z.string(),
  itemRef: z.string().nullable(),
  intent: z.enum(['CREDIT', 'DEBIT', 'RETURN', 'UNKNOWN']),
});

@Injectable()
export class RepairService {
  private readonly logger = new Logger(RepairService.name);

  sanitizeAndParse(rawLlmOutput: string): TransactionIntent {
    // safeParseAI repairs malformed JSON and validates against the Zod schema
    const result = safeParseAI(rawLlmOutput, TransactionIntentSchema);

    if (!result.success) {
      this.logger.error(
        'CRITICAL: agentic-json-repair failed to recover payload',
        result.error,
      );
      throw new Error('LLM_OUTPUT_UNRECOVERABLE');
    }

    this.logger.log('Successfully repaired and parsed LLM payload.');
    return result.data;
  }
}
