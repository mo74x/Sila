import { Controller, Get, Post, Query, Body, HttpCode, HttpStatus, Req, ForbiddenException } from '@nestjs/common';
import { IngestionService } from '../services/ingestion.service';
import type { Request } from 'express';

@Controller('webhook')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN ?? 'sila_secure_token_2026';
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    throw new ForbiddenException('Webhook verification failed: token mismatch');
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: any,
    @Req() req: Request,
  ) {
    const tenantId = (req as any).tenantId || 'default-tenant';
    return this.ingestionService.processWebhook(tenantId, payload);
  }
}
