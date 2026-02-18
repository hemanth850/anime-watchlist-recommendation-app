import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import { app } from "../app.js";

describe("api e2e smoke", () => {
  let server: ReturnType<typeof app.listen>;
  let baseUrl = "";

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => {
      server.once("listening", () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it("returns health and catalog endpoints", async () => {
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);

    const catalog = await fetch(`${baseUrl}/catalog?genre=Adventure&sort=rating_desc`);
    expect(catalog.status).toBe(200);
    const payload = (await catalog.json()) as { items: Array<{ title: string }> };
    expect(payload.items.length).toBeGreaterThan(0);
  });
});

