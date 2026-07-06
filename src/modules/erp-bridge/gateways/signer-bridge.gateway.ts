/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class SignerBridgeGateway {
  @WebSocketServer()
  server: Server;

  async requestCadesSignature(
    tenantId: string,
    documentHash: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const room = `tenant_bridge_${tenantId}`;
      const timeout = setTimeout(
        () => reject(new Error('SIGNER_BRIDGE_TIMEOUT')),
        10000,
      );

      this.server
        .to(room)
        .emit('SIGN_HASH', { hash: documentHash }, (response: any) => {
          clearTimeout(timeout);
          if (response?.error) {
            return reject(new Error(response.error));
          }
          resolve(response.cadesSignature);
        });
    });
  }
}
