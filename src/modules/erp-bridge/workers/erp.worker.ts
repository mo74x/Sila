import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class ErpWorker {
  private readonly logger = new Logger(ErpWorker.name);

  @MessagePattern('erp-events')
  async handleErpEvent(@Payload() data: any) {
    const tenantId = data.tenantId || 'unknown';
    this.logger.log(`[Tenant: ${tenantId}] Received legacy ERP event: ${JSON.stringify(data)}`);
    // Anti-Corruption Layer translates legacy format to gateway models
    return { processed: true };
  }
}
