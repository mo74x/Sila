import { Scope, Provider } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { MongoClient, Db } from 'mongodb';
import { TenantRequest } from '../interfaces/tenant-request.interface';

const connectionMap: Map<string, Db> = new Map();

export const TenantDatabaseProvider: Provider = {
  provide: 'TENANT_DB_CONNECTION',
  scope: Scope.REQUEST,
  useFactory: async (req: TenantRequest): Promise<Db> => {
    const tenantId = req.tenantId;

    const tenantKey = tenantId || 'default';

    if (connectionMap.has(tenantKey)) {
      return connectionMap.get(tenantKey)!;
    }

    const client = await MongoClient.connect(process.env.MONGO_BASE_URI || '', {
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    const db = client.db(`tenant_${tenantKey}`);
    connectionMap.set(tenantKey, db);

    return db;
  },
  inject: [REQUEST],
};
