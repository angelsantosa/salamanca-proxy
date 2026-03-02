import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@salamanca-proxy/api/context";
import { appRouter } from "@salamanca-proxy/api/routers/index";
import { auth } from "@salamanca-proxy/auth";
import { env } from "@salamanca-proxy/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// InvoiceNinja webhook — no auth session, uses secret validation
app.post("/api/webhooks/invoiceninja", async (c) => {
  const {
    getInvoiceSource,
    getPacProvider,
    executeStampPipeline,
  } = await import("@salamanca-proxy/integrations");

  const source = getInvoiceSource();
  const pac = getPacProvider();

  const isValid = await source.validateWebhook(c.req.raw, env.WEBHOOK_SECRET!);
  if (!isValid) return c.json({ error: "Unauthorized" }, 401);

  // IN doesn't include event type in the payload — read it from ?event= query param.
  // Each IN webhook subscription fires for exactly one event_id, so the event param
  // is set when configuring the webhook target URL in Invoice Ninja.
  const event = c.req.query("event");
  if (!event) return c.json({ error: "Missing event query parameter" }, 400);

  const body = await c.req.json();
  const webhook = source.parseWebhook(body, event);

  const stampableEvents = ["invoice.sent"];
  if (!stampableEvents.includes(webhook.eventType)) {
    return c.json({ status: "ignored", event: webhook.eventType });
  }

  try {
    const result = await executeStampPipeline({
      source,
      pac,
      entityId: webhook.entityId,
    });
    return c.json({ status: "stamped", uuid: result.uuid, stampId: result.stampId });
  } catch (error) {
    console.error("Stamp pipeline error:", error);
    return c.json(
      { status: "error", message: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context: context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
