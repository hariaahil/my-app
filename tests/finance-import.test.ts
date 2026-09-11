import { describe, expect, it } from "vitest";
import { categorizeTransaction } from "../lib/finance-categorizer";
import { parseStatementText } from "../lib/pdf-statement";

describe("Google Pay statement parser", () => {
  it("parses outgoing payments and normalizes the source bank", () => {
    const rows = parseStatementText(`
01 Mar, 2026
09:26 PM
Paid to H P PETROL PUMP M G SERVICE
UPI Transaction ID: 119360638902
Paid by Kotak Mahindra Bank 8551
₹800
`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      transaction_date: "2026-03-01",
      description: "H P PETROL PUMP M G SERVICE",
      amount: 800,
      transaction_type: "expense",
      provider_transaction_id: "119360638902",
      source_account: "Kotak ••••8551",
    });
  });

  it("parses incoming payments using the receiving account", () => {
    const rows = parseStatementText(`
09 Mar, 2026
09:42 AM
Received from THOTAKURI MADHU
UPI Transaction ID: 264208837139
Paid to IndusInd Bank 9641
₹150
`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      transaction_date: "2026-03-09",
      description: "THOTAKURI MADHU",
      amount: 150,
      transaction_type: "income",
      provider_transaction_id: "264208837139",
      source_account: "IndusInd ••••9641",
    });
  });

  it("keeps self transfers as transfers, never income or expense", () => {
    const rows = parseStatementText(`
05 Mar, 2026
05:29 PM
Self transfer to ICICI Bank 2694
UPI Transaction ID: 119547325958
Paid by Kotak Mahindra Bank 8551
₹65,000
`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      transaction_date: "2026-03-05",
      transaction_type: "transfer",
      source_account: "Kotak ••••8551",
      provider_transaction_id: "119547325958",
    });
  });

  it("normalizes UPI Circle bank text to the underlying bank account", () => {
    const rows = parseStatementText(`
25 Apr, 2026
12:41 PM
Paid to Ch Bunny
UPI Transaction ID: 648107511141
Paid by ICICI Bank 2694 | Paid for Shirisha Goud with UPI Circle
₹100
`);
    expect(rows[0]?.source_account).toBe("ICICI ••••2694");
  });

  it("deduplicates by provider transaction ID", () => {
    const rows = parseStatementText(`
01 Mar, 2026
09:26 PM
Paid to TEST MERCHANT
UPI Transaction ID: 123456789012
Paid by Kotak Mahindra Bank 8551
₹800
01 Mar, 2026
09:26 PM
Paid to TEST MERCHANT
UPI Transaction ID: 123456789012
Paid by Kotak Mahindra Bank 8551
₹800
`);
    expect(rows).toHaveLength(1);
  });
});

describe("direction-aware categorization", () => {
  it("does not turn a debit merchant description into Income", () => {
    const result = categorizeTransaction("ordinary income store", 240, "debit");
    expect(result.category).not.toBe("Income");
    expect(result.semanticType).toBe("expense");
  });

  it("classifies an explicit received transaction as income", () => {
    const result = categorizeTransaction("salary received", 50000, "credit");
    expect(result.category).toBe("Income");
    expect(result.semanticType).toBe("income");
  });
});
