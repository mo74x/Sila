import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { Session, SessionSchema } from '../schemas/session.schema';
import { OutboxEvent, OutboxEventSchema } from '../schemas/outbox.schema';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly dbService: DatabaseService) {}

  async updateState(
    tenantId: string,
    sessionId: string,
    stateDelta: any,
    eventType: string,
    eventPayload: any,
  ): Promise<any> {
    this.logger.log(`Updating ledger state for tenant: ${tenantId}, session: ${sessionId}`);

    const connection = await this.dbService.getConnection(tenantId);

    const sessionModel = connection.model(Session.name, SessionSchema);
    const outboxModel = connection.model(OutboxEvent.name, OutboxEventSchema);

    const session = await sessionModel.findOneAndUpdate(
      { tenantId, sessionId },
      { $set: { state: stateDelta } },
      { new: true, upsert: true },
    );

    await outboxModel.create({
      tenantId,
      eventType,
      payload: eventPayload,
      status: 'PENDING',
    });

    return session;
  }
}
