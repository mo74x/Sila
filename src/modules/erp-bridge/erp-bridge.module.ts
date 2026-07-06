import { Module } from '@nestjs/common';
import { EtaSignerGateway } from './gateways/eta-signer.gateway';
import { ErpWorker } from './workers/erp.worker';

@Module({
  controllers: [ErpWorker],
  providers: [EtaSignerGateway],
  exports: [EtaSignerGateway],
})
export class ErpBridgeModule {}
