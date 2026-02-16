import { parse } from "csv-parse/sync";
import { z } from "zod";

export type CsvRow = Record<string, string>;

export const importMappingSchema = z.object({
  sku: z.string().optional(),
  description: z.string().optional(),
  returnReason: z.string().optional(),
  unitCost: z.string().optional(),
  qty: z.string().optional(),
  vendor: z.string().optional(),
  brand: z.string().optional(),
  returnDate: z.string().optional(),
  receiptId: z.string().optional(),
  serialNumber: z.string().optional(),
  expectedCredit: z.string().optional()
});

export type ImportMapping = z.infer<typeof importMappingSchema>;

export function parseCsvText(input: string) {
  const rows = parse(input, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as CsvRow[];

  return rows;
}

export function previewRows(rows: CsvRow[], count = 25) {
  return rows.slice(0, count);
}

function numberValue(value?: string) {
  if (!value) {
    return null;
  }
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapCsvRow(row: CsvRow, mapping: ImportMapping) {
  const get = (column?: string) => {
    if (!column) {
      return undefined;
    }
    return row[column] ?? undefined;
  };

  return {
    sku: get(mapping.sku) ?? null,
    customerReturnReason: get(mapping.returnReason) ?? null,
    unitCost: numberValue(get(mapping.unitCost) ?? undefined),
    qty: numberValue(get(mapping.qty) ?? undefined) ?? 1,
    brand: get(mapping.brand) ?? null,
    returnDate: get(mapping.returnDate) ?? null,
    receiptId: get(mapping.receiptId) ?? null,
    serialNumber: get(mapping.serialNumber) ?? null,
    expectedCredit: numberValue(get(mapping.expectedCredit) ?? undefined),
    vendorName: get(mapping.vendor) ?? null
  };
}
