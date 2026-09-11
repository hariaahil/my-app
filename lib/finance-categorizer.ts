export type FinanceCategory = "Food" | "Fuel" | "Groceries" | "Shopping" | "Transport" | "Subscriptions" | "Bills & Utilities" | "Healthcare" | "Education" | "Entertainment" | "EMI / Loans" | "Investment" | "Transfer" | "Cash Withdrawal" | "Income" | "Other";

const rules: Array<[FinanceCategory, RegExp]> = [
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
  ["EMI / Loans", /emi|loan|mortgage|interest payment|finance ltd/i],
  ["Investment", /mutual fund|sip|zerodha|groww|upstox|coin|investment|nse|bse|broker/i],
  ["Cash Withdrawal", /atm|cash withdrawal|cash wd/i],
  ["Transfer", /upi\/|upi-|to [a-z]|transfer|sent to|imps|neft|rtgs/i],
];

export function categorizeTransaction(description: string, amount: number, typeHint?: string) {
  const text = description.trim();
  const hint = (typeHint || "").toLowerCase();
  if (hint.includes("credit") || hint.includes("received") || hint.includes("income")) return { category: "Income" as FinanceCategory, confidence: 0.98 };
  for (const [category, pattern] of rules) {
    if (pattern.test(text)) return { category, confidence: category === "Transfer" ? 0.82 : 0.94 };
  }
  if (amount < 0) return { category: "Other" as FinanceCategory, confidence: 0.35 };
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
