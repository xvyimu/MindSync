import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import express from 'express';

import { registerHealthzRoute } from '../src/health.js';

type TestHealthProvider = {
  getHealthStatus: () => Promise<{
    initialized: boolean;
    services: Record<string, boolean>;
  }>;
};

async function startHealthServer(provider: TestHealthProvider): Promise<{
  server: Server;
  url: string;
}> {
  const app = express();
  registerHealthzRoute(app, provider);

  const server = await new Promise<Server>((resolve) => {
    const httpServer = app.listen(0, '127.0.0.1', () => resolve(httpServer));
  });

  const { port } = server.address() as AddressInfo;
  return {
    server,
    url: `http://127.0.0.1:${port}/healthz`
  };
}

async function stopServer(server: Server | undefined): Promise<void> {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

describe('MCP health route', () => {
  let server: Server | undefined;

  afterEach(async () => {
    await stopServer(server);
    server = undefined;
  });

  it('returns 200 when core services are initialized and healthy', async () => {
    const provider: TestHealthProvider = {
      getHealthStatus: vi.fn().mockResolvedValue({
        initialized: true,
        services: {
          modelManager: true,
          llmService: true,
          languageService: true,
          templateManager: true,
          historyManager: true,
          promptService: true
        }
      })
    };

    const running = await startHealthServer(provider);
    server = running.server;

    const response = await fetch(running.url);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('returns 503 when any required service is unhealthy', async () => {
    const provider: TestHealthProvider = {
      getHealthStatus: vi.fn().mockResolvedValue({
        initialized: true,
        services: {
          modelManager: true,
          llmService: false
        }
      })
    };

    const running = await startHealthServer(provider);
    server = running.server;

    const response = await fetch(running.url);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false });
  });

  it('returns 503 when the health provider throws', async () => {
    const provider: TestHealthProvider = {
      getHealthStatus: vi.fn().mockRejectedValue(new Error('boom'))
    };

    const running = await startHealthServer(provider);
    server = running.server;

    const response = await fetch(running.url);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false });
  });
});
