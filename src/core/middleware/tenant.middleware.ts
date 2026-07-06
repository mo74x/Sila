/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { TenantRequest } from '../interfaces/tenant-request.interface';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, res: Response, next: NextFunction) {
    const tenantId =
      req.headers['x-tenant-id'] ||
      req.body?.entry?.[0]?.changes?.[0]?.value?.metadata?.display_phone_number;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant_Missing' });
    }

    req.tenantId = tenantId as string;
    next();
  }
}
