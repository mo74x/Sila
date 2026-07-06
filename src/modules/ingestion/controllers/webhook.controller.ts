/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { IngestionService } from '../services/ingestion.service';

@Controller('webhook/whatsapp')
export class WebhookController {
  constructor(private readonly ingestionService: IngestionService) {}

  // Meta calls this when you first configure the webhook URL in their developer portal
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN;

    if (mode && token) {
      if (mode === 'subscribe' && token === verifyToken) {
        // Must return exactly the challenge string to pass verification
        return res.status(HttpStatus.OK).send(challenge);
      } else {
        return res.sendStatus(HttpStatus.FORBIDDEN);
      }
    }
    return res.sendStatus(HttpStatus.BAD_REQUEST);
  }

  // Meta posts all user messages and status updates (read receipts, etc.) here
  @Post()
  async handleIncomingMessages(@Body() body: any, @Res() res: Response) {
    // 1. Immediately acknowledge receipt to prevent Meta from retrying and penalizing us
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    // 2. Process the event asynchronously in the background
    // We do not await this operation in the main thread to ensure the HTTP response is instantaneous.
    setImmediate(() => {
      this.ingestionService.processWebhookEvent(body);
    });
  }
}
