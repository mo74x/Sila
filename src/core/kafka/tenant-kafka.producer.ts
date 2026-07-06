/* eslint-disable @typescript-eslint/require-await */
import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { ClientKafka } from '@nestjs/microservices';
import type { TenantRequest } from '../interfaces/tenant-request.interface';

@Injectable({ scope: Scope.REQUEST })
export class TenantKafkaProducer {
  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    @Inject(REQUEST) private readonly req: TenantRequest,
  ) {}

  async emitWhatsappEvent(payload: any) {
    const tenantId = this.req.tenantId;
    // Route to the isolated tenant topic
    const topic = `tenant.${tenantId}.whatsapp.ingest`;

    // Fire and forget (emit) to ensure ultra-fast execution
    return this.kafkaClient.emit(topic, {
      ...payload,
      tenantId,
      receivedAt: new Date().toISOString(),
    });
  }
}
