import { NextResponse } from "next/server";

export async function GET() {
  const csv = [
    "receiptId,sku,description,returnReason,unitCost,qty,vendor,brand,returnDate,serialNumber,expectedCredit",
    "R-1001,SKU-001,Drill Battery,Dead on arrival,39.99,1,Acme Tools,Acme,2026-02-01,SN-001,32.00",
    "R-1002,SKU-002,Alternator,Failed test,129.00,1,AutoMakers,VoltWorks,2026-02-03,SN-002,112.00"
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=vendorcredit-import-template.csv"
    }
  });
}
