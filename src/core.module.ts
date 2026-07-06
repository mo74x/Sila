import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TenantMiddleware } from './core/middleware/tenant.middleware';
import { TenantDatabaseProvider } from './core/database/tenant-db.provider';

@Module({
  providers: [TenantDatabaseProvider],
  exports: [TenantDatabaseProvider],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
