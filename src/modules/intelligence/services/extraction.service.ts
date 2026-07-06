import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private readonly openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || 'mock-openai-api-key';
    this.openai = new OpenAI({ apiKey });
  }

  async extractStructuredData(tenantId: string, text: string, context: any): Promise<any> {
    this.logger.log(`Performing LLM extraction for tenant: ${tenantId}`);

    const systemPrompt = `
You are an expert extraction system for a multi-tenant gateway.
Extract metadata and structured fields from the input message according to the provided context.
Output JSON only.
`;

    const userPrompt = `
Context: ${JSON.stringify(context)}
Input text: ${text}
`;

    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY is not defined. Returning simulated payload.');
      return {
        tenantId,
        extracted: true,
        summary: `Extracted data for: "${text.substring(0, Math.min(30, text.length))}..."`,
        originalText: text,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const rawJson = response.choices[0]?.message?.content || '{}';
      return JSON.parse(rawJson);
    } catch (err: any) {
      this.logger.error(`Error during LLM extraction for tenant ${tenantId}`, err);
      throw err;
    }
  }
}
