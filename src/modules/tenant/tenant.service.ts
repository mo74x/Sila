import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface TenantConfig {
  id: string;
  name: string;
  apiKey: string;
  whatsAppPhoneId?: string;
  isActive: boolean;
}

@Injectable()
export class TenantService {
  private readonly tenantsConfig: Map<string, TenantConfig> = new Map([
    [
      'tenant-a',
      {
        id: 'tenant-a',
        name: 'Tenant Alpha',
        apiKey: 'key_alpha_123',
        whatsAppPhoneId: '123456789',
        isActive: true,
      },
    ],
    [
      'tenant-b',
      {
        id: 'tenant-b',
        name: 'Tenant Beta',
        apiKey: 'key_beta_456',
        whatsAppPhoneId: '987654321',
        isActive: false,
      },
    ],
  ]);

  async getTenantConfig(tenantId: string): Promise<TenantConfig> {
    const config = this.tenantsConfig.get(tenantId);
    if (!config) {
      throw new UnauthorizedException(`Tenant ${tenantId} not found`);
    }
    return config;
  }

  async validateApiKey(tenantId: string, apiKey: string): Promise<boolean> {
    try {
      const config = await this.getTenantConfig(tenantId);
      return config.isActive && config.apiKey === apiKey;
    } catch {
      return false;
    }
  }
}
