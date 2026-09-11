export type ParsedStatementTransaction = {
  transaction_date: string | null;
  description: string;
  amount: number;
  transaction_type: "income" | "expense" | "transfer";
  provider_transaction_id?: string;
  source_account?: string;
};

function money(value: string) {
  return Math.abs(Number(value.replace(/[₹,\s()]/g, "")) || 0);
}

function dateValue(value: string) {
  const match = value.match(/(\d{1,2})\s+([A-Za-z]{3}),\s*(\d{4})/);
  if (!match) return null;
  const [, day, monthText, year] = match;
  const months: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  const month = months[monthText.slice(0, 1).toUpperCase() + monthText.slice(1, 3).toLowerCase()];
  return month ? `${year}-${month}-${day.padStart(2, "0")}` : null;
}

function normalizeSourceAccount(value: string) {
  const raw = value.replace(/\s+/g, " ").trim();
  if (!raw) return undefined;
  const aliases: Record<string, string> = {
    "kotak mahindra bank": "Kotak",
    "indusind bank": "IndusInd",
    "slice small finance bank": "Slice",
    "icici bank": "ICICI",
    "axis bank": "Axis",
    "hdfc bank": "HDFC",
    "federal bank": "Federal",
  };

  const card = raw.match(/^(.*?)\s+XX(\d{2})\s*\|\s*(.+)$/i);
  if (card) {
    const issuer = aliases[card[1].trim().toLowerCase()] || card[1].trim();
    return `${issuer} ••XX${card[2]} | ${card[3].trim()}`;
  }

  const bank = raw.match(/^(.*?)\s+(\d{4})(?:\s*\|\s*Paid\s+for\s+.+)?$/i);
  if (!bank) return raw;
  const institution = aliases[bank[1].trim().toLowerCase()] || bank[1].trim();
  return `${institution} ••••${bank[2]}`;
}

function accountFrom(text: string, label: "Paid by" | "Paid to") {
  const match = text.match(new RegExp(`${label.replace(" ", "\\s+")}\\s+(.+?)(?=\\s+₹|\\s*$)`, "i"));
  return match ? normalizeSourceAccount(match[1]) : undefined;
}

export function parseStatementText(text: string): ParsedStatementTransaction[] {
  const normalized = text.replace(/\r/g, "");
  if (!normalized.trim()) throw new Error("This PDF has no selectable text. It may be a scanned statement and needs OCR.");

  const datePattern = /\b\d{1,2}\s*[A-Za-z]{3},\s*\d{4}\b/g;
  const dates = [...normalized.matchAll(datePattern)];
  const result: ParsedStatementTransaction[] = [];

  for (let i = 0; i < dates.length; i++) {
    const start = dates[i].index ?? 0;
    const end = i + 1 < dates.length ? (dates[i + 1].index ?? normalized.length) : normalized.length;
    const block = normalized.slice(start, end).replace(/\s+/g, " ").trim();
    const dateText = dates[i][0];

    const selfTransfer = block.match(/Self\s+transfer\s+to\s+(.+?)\s+UPI\s*Transaction\s*ID\s*:\s*(\d{8,})/i);
    const received = block.match(/Received\s+from\s+(.+?)\s+UPI\s*Transaction\s*ID\s*:\s*(\d{8,})/i);
    const paid = block.match(/Paid\s+to\s+(.+?)\s+UPI\s*Transaction\s*ID\s*:\s*(\d{8,})/i);
    const match = selfTransfer || received || paid;
    if (!match) continue;

    const amountMatches = [...block.matchAll(/₹\s*\(?-?\d[\d,]*(?:\.\d{1,2})?\)?/g)];
    if (!amountMatches.length) continue;
    const amount = money(amountMatches[amountMatches.length - 1][0]);
    if (!amount) continue;

    const transaction_type = selfTransfer ? "transfer" : received ? "income" : "expense";
    const rawDescription = match[1].replace(/\s+/g, " ").trim();
    const description = selfTransfer ? `Self transfer to ${rawDescription}` : rawDescription;
    if (description.length < 2) continue;

    const account = selfTransfer || paid ? accountFrom(block, "Paid by") : accountFrom(block, "Paid to");
    const sourceAccount = account ? `${account}::${match[2]}` : undefined;

    result.push({
      transaction_date: dateValue(dateText),
      description,
      amount,
      transaction_type,
      provider_transaction_id: match[2],
      source_account: sourceAccount,
    });
  }

  return [...new Map(result.map((r) => [r.provider_transaction_id || `${r.transaction_date}|${r.description.toLowerCase()}|${r.amount}|${r.transaction_type}`, r])).values()];
}

export async function extractPdfStatement(file: File): Promise<ParsedStatementTransaction[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.mjs";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join("\n"));
  }
  return parseStatementText(pages.join("\n"));
}
