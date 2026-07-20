import type { Express } from 'express';

import type { CoreServicesManager } from './adapters/core-services.js';

export type MCPHealthStatus = Awaited<ReturnType<CoreServicesManager['getHealthStatus']>>;
type HealthStatusProvider = Pick<CoreServicesManager, 'getHealthStatus'>;

function isHealthyStatus(healthStatus: MCPHealthStatus): boolean {
  return healthStatus.initialized && Object.values(healthStatus.services).every(Boolean);
}

export function buildHealthzResponse(healthStatus: MCPHealthStatus): {
  statusCode: number;
  // 对外只返回 ok 布尔，避免泄露 initialized/services 内部状态
  body: { ok: boolean };
} {
  const ok = isHealthyStatus(healthStatus);
  return {
    statusCode: ok ? 200 : 503,
    body: { ok }
  };
}

export function registerHealthzRoute(app: Express, healthProvider: HealthStatusProvider): void {
  app.get('/healthz', async (_req, res) => {
    try {
      const healthStatus = await healthProvider.getHealthStatus();
      const { statusCode, body } = buildHealthzResponse(healthStatus);
      res.status(statusCode).json(body);
    } catch {
      res.status(503).json({ ok: false });
    }
  });
}
