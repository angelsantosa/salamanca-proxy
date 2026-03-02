import type { CanonicalInvoice } from "../../canonical/types";
import type { InvoiceSource, WebhookPayload } from "../../types";
import { InvoiceNinjaClient } from "./client";
import { mapToCanonical } from "./mapper";
import type { INWebhookPayload } from "./types";

interface InvoiceNinjaSourceConfig {
  baseUrl: string;
  apiToken: string;
  issuerRfc: string;
  issuerName: string;
  issuerFiscalRegime: string;
  issuerExpeditionPlace: string;
}

export class InvoiceNinjaSource implements InvoiceSource {
  readonly name = "invoiceninja";
  private client: InvoiceNinjaClient;
  private config: InvoiceNinjaSourceConfig;

  constructor(config: InvoiceNinjaSourceConfig) {
    this.config = config;
    this.client = new InvoiceNinjaClient(config.baseUrl, config.apiToken);
  }

  async validateWebhook(request: Request, secret: string): Promise<boolean> {
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    return querySecret === secret;
  }

  parseWebhook(body: unknown, eventType?: string): WebhookPayload {
    const payload = body as INWebhookPayload;
    return {
      eventType: eventType ?? "unknown",
      entityId: payload.id,
      rawBody: body,
    };
  }

  async getCanonicalInvoice(entityId: string): Promise<CanonicalInvoice> {
    const invoice = await this.client.getInvoice(entityId);
    const client = await this.client.getClient(invoice.client_id);

    return mapToCanonical(invoice, client, {
      rfc: this.config.issuerRfc,
      name: this.config.issuerName,
      fiscalRegime: this.config.issuerFiscalRegime,
      expeditionPlace: this.config.issuerExpeditionPlace,
    });
  }

  async attachFile(
    entityId: string,
    fileName: string,
    buffer: Buffer,
  ): Promise<void> {
    await this.client.uploadFile(entityId, fileName, buffer);
  }

  async writeBackUuid(entityId: string, uuid: string): Promise<void> {
    await this.client.updateInvoiceCustomField(
      entityId,
      "custom_value3",
      uuid,
    );
  }
}
