/**
 * Invoice Ninja v5 webhook payload.
 *
 * IN sends the entity as a flat JSON object (no wrapper).
 * The event type is NOT included in the payload — each webhook
 * subscription is tied to a single event_id, so we pass the event
 * via the `?event=` query parameter on the target URL.
 */
export interface INWebhookPayload {
  id: string;
  number?: string;
  client_id?: string;
  [key: string]: unknown;
}

export interface INInvoice {
  id: string;
  number: string;
  client_id: string;
  date: string;
  amount: number;
  balance: number;
  discount: number;
  currency_id: string;
  line_items: INLineItem[];
  custom_value1: string; // payment form
  custom_value2: string; // payment method
  custom_value3: string; // CFDI UUID (written back)
  custom_value4: string;
  [key: string]: unknown;
}

export interface INLineItem {
  product_key: string;
  notes: string;
  cost: number;
  quantity: number;
  discount: number;
  tax_name1: string;
  tax_rate1: number;
  tax_name2: string;
  tax_rate2: number;
  tax_name3: string;
  tax_rate3: number;
  custom_value1: string; // SAT product code
  custom_value2: string; // SAT unit code
  custom_value3: string; // tax object
  custom_value4: string;
  line_total: number;
  [key: string]: unknown;
}

export interface INClient {
  id: string;
  name: string;
  vat_number: string; // RFC
  custom_value1: string; // fiscal regime
  custom_value2: string; // CFDI use
  custom_value3: string; // tax zip code
  custom_value4: string;
  [key: string]: unknown;
}

/**
 * Custom field mapping for InvoiceNinja entities.
 *
 * Client:
 *   vat_number  → RFC
 *   custom_value1 → fiscal regime
 *   custom_value2 → CFDI use
 *   custom_value3 → tax zip code
 *
 * Invoice:
 *   custom_value1 → payment form
 *   custom_value2 → payment method
 *   custom_value3 → CFDI UUID (written back after stamp)
 *
 * Line items:
 *   custom_value1 → SAT product code
 *   custom_value2 → SAT unit code
 *   custom_value3 → tax object
 */
export const CUSTOM_FIELD_MAP = {
  client: {
    rfc: "vat_number",
    fiscalRegime: "custom_value1",
    cfdiUse: "custom_value2",
    taxZipCode: "custom_value3",
  },
  invoice: {
    paymentForm: "custom_value1",
    paymentMethod: "custom_value2",
    cfdiUuid: "custom_value3",
  },
  lineItem: {
    productCode: "custom_value1",
    unitCode: "custom_value2",
    taxObject: "custom_value3",
  },
} as const;
