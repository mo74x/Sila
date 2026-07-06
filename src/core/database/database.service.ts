/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Connection, createConnection } from 'mongoose';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private connections: Map<string, Connection> = new Map();

  async getConnection(tenantId: string): Promise<Connection> {
    if (this.connections.has(tenantId)) {
      return this.connections.get(tenantId)!;
    }

    const baseUri = process.env.MONGO_BASE_URI ?? 'mongodb://localhost:27017';
    const normalizedBaseUri = baseUri.endsWith('/') ? baseUri : `${baseUri}/`;
    const uri = `${normalizedBaseUri}${tenantId}`;

    this.logger.log(`Creating dynamic connection for tenant: ${tenantId}`);
    const connection = createConnection(uri);

    await new Promise<void>((resolve, reject) => {
      connection.once('open', () => {
        this.logger.log(
          `Successfully connected to database for tenant: ${tenantId}`,
        );
        resolve();
      });
      connection.once('error', (err) => {
        this.logger.error(
          `Error connecting to database for tenant: ${tenantId}`,
          err,
        );
        reject(err);
      });
    });

    this.connections.set(tenantId, connection);
    return connection;
  }

  async onModuleDestroy() {
    this.logger.log('Closing all dynamic Mongo connections...');
    for (const [tenantId, connection] of this.connections.entries()) {
      await connection.close();
      this.logger.log(`Closed database connection for tenant: ${tenantId}`);
    }
  }
}
