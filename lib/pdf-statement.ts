export type ParsedStatementTransaction = {
  transaction_date: string | null;
  description: string;
  amount: number;
  transaction_type: "income" | "expense";
  provider_transaction_id?: string;
};

function money(value: string) {
  return Math.abs(Number(value.replace(/[₹,\s]/g, "")) || 0);
}

function dateValue(value: string) {
  const d = new Date(value.replace(/,/g, ""));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function extractPdfStatement(file: File): Promise<ParsedStatementTransaction[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Keep the worker exactly aligned with the installed PDF.js API version.
  pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.mjs";

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: string[] = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join("\n"));
  }

  const text = pages.join("\n").replace(/\r/g, "");
  if (!text.trim()) {
    throw new Error("This PDF has no selectable text. It may be a scanned statement and needs OCR.");
  }

  // Google Pay statements use dates such as "02 Aug, 2026" and PDF.js may
  // flatten spaces, producing "02Aug,2026". Split on both forms.
  const datePattern = /\b\d{1,2}\s*[A-Za-z]{3},\s*\d{4}\b/g;
  const dates = [...text.matchAll(datePattern)];
  const result: ParsedStatementTransaction[] = [];

  for (let i = 0; i < dates.length; i++) {
    const start = dates[i].index ?? 0;
    const end = i + 1 < dates.length ? (dates[i + 1].index ?? text.length) : text.length;
    const block = text.slice(start, end).replace(/\s+/g, " ").trim();
    const dateText = dates[i][0];

    // Only payment rows are imported. Self-transfer rows are intentionally
    // skipped because they are movements between the user's own accounts.
    const payment = block.match(/Paid\s*to\s*(.+?)\s+UPI\s*Transaction\s*ID\s*:\s*(\d{8,})/i);
    if (!payment || /Self\s*transfer/i.test(block)) continue;

    const amountMatches = [...block.matchAll(/₹\s*\(?-?\d[\d,]*(?:\.\d{1,2})?\)?/g)];
    if (!amountMatches.length) continue;

    const rawAmount = amountMatches[amountMatches.length - 1][0];
    const amount = money(rawAmount);
    if (!amount) continue;

    const description = payment[1]
      .replace(/\s+/g, " ")
      .trim();
    if (description.length < 2) continue;

    const income = /\b(?:received|credited|credit|deposit|salary|interest)\b/i.test(block);
    result.push({
      transaction_date: dateValue(dateText),
      description,
      amount,
      transaction_type: income ? "income" : "expense",
      provider_transaction_id: payment[2],
    });
  }

  return [...new Map(
    result.map((r) => [r.provider_transaction_id || `${r.transaction_date}|${r.description.toLowerCase()}|${r.amount}|${r.transaction_type}`, r]),
  ).values()];
}
