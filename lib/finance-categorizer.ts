export type FinanceCategory = "Food" | "Fuel" | "Groceries" | "Shopping" | "Transport" | "Subscriptions" | "Bills & Utilities" | "Healthcare" | "Education" | "Entertainment" | "EMI / Loans" | "Investment" | "Transfer" | "Cash Withdrawal" | "Income" | "Other";

const rules: Array<[FinanceCategory, RegExp]> = [
  ["Transfer", /self[ -]?transfer|own account|own bank|to my (kotak|indusind|hdfc|icici|axis|sbi)|from my (kotak|indusind|hdfc|icici|axis|sbi)/i],
  ["EMI / Loans", /emi|loan repayment|loan instalment|loan installment|mortgage|home loan|car loan|finance ltd/i],
  ["Investment", /mutual fund|sip|zerodha|groww|upstox|coin|investment|nse|bse|broker|demat|fd|fixed deposit|recurring deposit|chit fund/i],
  ["Food", /swiggy|zomato|restaurant|cafe|food|domino|pizza|mcdonald|kfc|hotel|bakery|dining|eat/i],
  ["Fuel", /hpcl|bharat petroleum|bharatpetroleum|indian oil|indianoil|iocl|bpcl|shell|reliance petroleum|petrol|fuel|diesel/i],
  ["Groceries", /bigbasket|blinkit|zepto|instamart|dmart|reliance fresh|more supermarket|grocery|supermarket/i],
  ["Shopping", /amazon|flipkart|myntra|ajio|meesho|shopping|retail|mall|decathlon/i],
  ["Transport", /uber|ola|rapido|metro|irctc|redbus|makemytrip|flight|airlines|parking|toll|cab|taxi/i],
  ["Subscriptions", /netflix|spotify|prime video|hotstar|youtube premium|google one|apple\.com\/bill|subscription/i],
  ["Bills & Utilities", /electricity|water bill|gas bill|broadband|airtel|jio|vi |vodafone|bsnl|utility|recharge|dth/i],
  ["Healthcare", /pharmacy|medical|hospital|apollo|medplus|netmeds|1mg|doctor|clinic|health/i],
  ["Education", /school|college|university|course|udemy|coursera|education|tuition/i],
  ["Entertainment", /movie|cinema|pvr|inox|bookmyshow|gaming|game|entertainment/i],
  ["Cash Withdrawal", /atm|cash withdrawal|cash wd/i],
];

const incoming = /(credit|received|salary|payroll|rent received|rental income|interest received|interest credit|fd interest|deposit interest|business income|freelance income|refund|cashback)/i;
const borrowed = /(loan disbursal|loan credited|loan received|personal loan received|home loan received|car loan received|loan amount)/i;

export function categorizeTransaction(description: string, amount: number, typeHint?: string) {
  const text = description.trim();
  const hint = (typeHint || "").toLowerCase();
  if (/self[ -]?transfer|own account|own bank/i.test(text)) return { category: "Transfer" as FinanceCategory, confidence: 0.99 };
  if (incoming.test(hint + " " + text)) {
    if (borrowed.test(text)) return { category: "Other" as FinanceCategory, confidence: 0.91 };
    if (/rent received|rental income/i.test(text)) return { category: "Income" as FinanceCategory, confidence: 0.97 };
    if (/salary|payroll/i.test(text)) return { category: "Income" as FinanceCategory, confidence: 0.99 };
    if (/interest received|interest credit|fd interest|deposit interest/i.test(text)) return { category: "Income" as FinanceCategory, confidence: 0.97 };
    return { category: "Income" as FinanceCategory, confidence: 0.90 };
  }
  for (const [category, pattern] of rules) {
    if (pattern.test(text)) return { category, confidence: category === "Transfer" ? 0.99 : category === "Investment" || category === "EMI / Loans" ? 0.91 : 0.94 };
  }
  if (amount >= 50000) return { category: "Other" as FinanceCategory, confidence: 0.45 };
  return { category: "Other" as FinanceCategory, confidence: 0.35 };
}

export function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseMoney(value: string | undefined) {
  if (!value) return 0;
  const cleaned = value.replace(/[₹,$,\s]/g, "").replace(/\(([^)]+)\)/, "-$1");
  const number = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
}

export function parseCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { out.push(current.trim()); current = ""; }
    else current += ch;
  }
  out.push(current.trim());
  return out;
}
