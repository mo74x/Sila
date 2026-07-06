import { Injectable } from '@nestjs/common';
import { RepairService, TransactionIntent } from './repair.service';
import OpenAI from 'openai';

@Injectable()
export class ExtractionService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(private readonly repairService: RepairService) {}

  async processUnstructuredText(
    transcribedText: string,
  ): Promise<TransactionIntent> {
    const prompt = `
      You are an expert financial logistics parser for the Egyptian market.
      Extract the transaction details from the following driver voice note transcription.
      
      Output ONLY a raw JSON object with these exact keys: 
      "amount" (number), "currency" (string, default "EGP"), "itemRef" (string), "intent" ("CREDIT"|"DEBIT"|"RETURN").
      Do not include markdown formatting or conversational text.

      Transcription: "${transcribedText}"
    `;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o', // Or whatever model you prefer
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const rawOutput = completion.choices[0].message.content || '{}';

    // Pass to your repair utility to guarantee safe ERP insertion
    return this.repairService.sanitizeAndParse(rawOutput);
  }
}
