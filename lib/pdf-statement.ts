export type ParsedStatementTransaction = {
  transaction_date: string | null;
  description: string;
  amount: number;
  transaction_type: "income" | "expense";
};

function money(value: string) {
  return Math.abs(Number(value.replace(/[₹,]/g, "")) || 0);
}

function dateValue(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function extractPdfStatement(file: File): Promise<ParsedStatementTransaction[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  const lines: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    lines.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  const text = lines.join("\n");
  if (!text.trim()) throw new Error("This PDF has no selectable text. It may be a scanned statement and needs OCR.");

  const result: ParsedStatementTransaction[] = [];
  const chunks = text.split(/\r?\n|(?=\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b)/).map((s) => s.trim()).filter(Boolean);
  for (const line of chunks) {
    const dm = line.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/);
    if (!dm) continue;
    const amountMatches = [...line.matchAll(/(?:₹\s*)?\(?-?\d[\d,]*(?:\.\d{1,2})?\)?/g)];
    if (!amountMatches.length) continue;
    const last = amountMatches[amountMatches.length - 1];
    const description = line.slice((dm.index || 0) + dm[0].length, last.index || line.length)
      .replace(/\b(?:debit|credit|withdrawal|deposit|balance|dr|cr)\b/gi, " ")
      .replace(/\s+/g, " ").trim();
    const amount = money(last[0]);
    if (description.length < 2 || !amount) continue;
    const income = /\b(?:cr|credit|credited|deposit|received|salary|interest)\b/i.test(line);
    result.push({ transaction_date: dateValue(dm[1]), description, amount, transaction_type: income ? "income" : "expense" });
  }
  return [...new Map(result.map((r) => [`${r.transaction_date}|${r.description.toLowerCase()}|${r.amount}|${r.transaction_type}`, r])).values()];
}
