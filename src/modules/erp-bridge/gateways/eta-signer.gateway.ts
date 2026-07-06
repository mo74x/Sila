import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true, namespace: 'eta' })
export class EtaSignerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EtaSignerGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const tenantId = client.handshake.query.tenantId;
    this.logger.log(`ETA Client connected: ${client.id}, Tenant: ${tenantId}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`ETA Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sign-document')
  async handleSignDocument(
    @MessageBody() data: { documentId: string; payload: any },
    @ConnectedSocket() client: Socket,
  ) {
    const tenantId = client.handshake.query.tenantId as string;
    this.logger.log(`Signing document ${data.documentId} for tenant ${tenantId}`);
    
    client.emit('sign-request', { documentId: data.documentId, payload: data.payload });
    
    return { status: 'requested', documentId: data.documentId };
  }
}
