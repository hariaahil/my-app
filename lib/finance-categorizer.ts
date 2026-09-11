export type FinanceCategory = "Food" | "Fuel" | "Groceries" | "Shopping" | "Transport" | "Subscriptions" | "Bills & Utilities" | "Healthcare" | "Education" | "Entertainment" | "EMI / Loans" | "Investment" | "Transfer" | "Cash Withdrawal" | "Income" | "Other";

export type SemanticTransactionType = "income" | "expense" | "transfer" | "emi" | "investment" | "money_lent" | "chit_contribution" | "loan_received" | "savings_used" | "investment_withdrawal" | "cash_withdrawal" | "unknown";

export type Classification = {
  category: FinanceCategory;
  semanticType: SemanticTransactionType;
  confidence: number;
  requiresReview: boolean;
  explanation: string;
};

const rules: Array<[FinanceCategory, RegExp]> = [
  ["Transfer", /self[ -]?transfer|own account|own bank|to my (kotak|indusind|hdfc|icici|axis|sbi)|from my (kotak|indusind|hdfc|icici|axis|sbi)/i],
  ["EMI / Loans", /\bemi\b|loan repayment|loan instalment|loan installment|mortgage|home loan|car loan|finance ltd/i],
  ["Investment", /mutual fund|\bsip\b|zerodha|groww|upstox|coin|investment|\bnse\b|\bbse\b|broker|demat|\bfd\b|fixed deposit|recurring deposit|chit fund/i],
  ["Food", /swiggy|zomato|restaurant|cafe|food|domino|pizza|mcdonald|kfc|hotel|bakery|dining|eat/i],
  ["Fuel", /hpcl|bharat petroleum|bharatpetroleum|indian oil|indianoil|iocl|bpcl|shell|reliance petroleum|petrol|fuel|diesel|filling station/i],
  ["Groceries", /bigbasket|blinkit|zepto|instamart|dmart|reliance fresh|more supermarket|grocery|supermarket|mart/i],
  ["Shopping", /amazon|flipkart|myntra|ajio|meesho|shopping|retail|mall|decathlon|jewellery|jewelry/i],
  ["Transport", /uber|ola|rapido|metro|irctc|redbus|makemytrip|flight|airlines|parking|toll|cab|taxi/i],
  ["Subscriptions", /netflix|spotify|prime video|hotstar|youtube premium|google one|apple\.com\/bill|subscription/i],
  ["Bills & Utilities", /electricity|water bill|gas bill|broadband|airtel|jio|vi |vodafone|bsnl|utility|recharge|dth/i],
  ["Healthcare", /pharmacy|medical|hospital|apollo|medplus|netmeds|1mg|doctor|clinic|health/i],
  ["Education", /school|college|university|course|udemy|coursera|education|tuition/i],
  ["Entertainment", /movie|cinema|pvr|inox|bookmyshow|gaming|game|entertainment/i],
  ["Cash Withdrawal", /atm|cash withdrawal|cash wd/i],
];

const received = /\b(received|credited|salary|payroll|rent received|rental income|interest received|interest credit|fd interest|deposit interest|business income|freelance income|refund|cashback)\b/i;
const borrowed = /\b(loan disbursal|loan credited|loan received|personal loan received|home loan received|car loan received|loan amount received)\b/i;
const lending = /\b(lent|loaned|given to|gave to|money to|interest at \d+(?:\.\d+)?%|at \d+% interest)\b/i;
const investmentWithdrawal = /\b(redeemed|redemption|withdrawn from mutual fund|mutual fund withdrawal|fd maturity|fixed deposit maturity|maturity proceeds|investment withdrawal)\b/i;
const savingsUsed = /\b(savings|previous savings|own savings|balance used)\b/i;
const chit = /\b(chit|chitty)\b/i;

function review(amount: number, confidence: number) {
  return amount >= 50000 || confidence < 0.75;
}

export function categorizeTransaction(description: string, amount: number, typeHint?: string): Classification {
  const text = description.trim();
  const hint = (typeHint || "").toLowerCase();
  const combined = `${hint} ${text}`;
  const isCreditDirection = /\b(credit|credited|cr|received|deposit|income)\b/i.test(hint);
  const isDebitDirection = /\b(debit|debited|dr|paid|withdrawal|expense)\b/i.test(hint);

  // Explicit movement between the user's own accounts always wins over amount/direction.
  if (/self[ -]?transfer|own account|own bank|to my (kotak|indusind|hdfc|icici|axis|sbi)|from my (kotak|indusind|hdfc|icici|axis|sbi)/i.test(text)) {
    return { category: "Transfer", semanticType: "transfer", confidence: 0.995, requiresReview: false, explanation: "Movement between your own accounts; excluded from income and spending." };
  }

  // Never infer income merely because a payment source says "credit card".
  // A GPay "Paid to ..." record is an outgoing payment even when the funding source is a credit card.
  if (/\bpaid\s+to\b/i.test(text) && !isCreditDirection) {
    if (lending.test(text)) return { category: "Other", semanticType: "money_lent", confidence: 0.88, requiresReview: true, explanation: "Money appears to have been given to another person; principal should be tracked as a lending asset, not spending." };
    if (chit.test(text)) return { category: "Investment", semanticType: "chit_contribution", confidence: 0.94, requiresReview: review(amount, 0.94), explanation: "Chit contribution is treated as a financial asset movement, not ordinary spending." };
    if (investmentWithdrawal.test(text)) return { category: "Investment", semanticType: "investment_withdrawal", confidence: 0.94, requiresReview: false, explanation: "This looks like money returning from an investment; principal is not ordinary income." };
    if (savingsUsed.test(text)) return { category: "Other", semanticType: "savings_used", confidence: 0.86, requiresReview: true, explanation: "Existing savings appear to be funding the transaction; this is not new income." };
  }

  // Explicit incoming loan is a liability, not income.
  if (borrowed.test(text) && isCreditDirection) {
    return { category: "EMI / Loans", semanticType: "loan_received", confidence: 0.97, requiresReview: false, explanation: "Loan proceeds increase cash but also create a liability, so they are not counted as earned income." };
  }

  // True incoming money is checked before ordinary merchant categories.
  if (isCreditDirection || received.test(combined)) {
    if (borrowed.test(text)) return { category: "EMI / Loans", semanticType: "loan_received", confidence: 0.97, requiresReview: false, explanation: "Loan proceeds are not income." };
    if (investmentWithdrawal.test(text)) return { category: "Investment", semanticType: "investment_withdrawal", confidence: 0.94, requiresReview: false, explanation: "Investment principal returning is not ordinary income." };
    if (savingsUsed.test(text)) return { category: "Other", semanticType: "savings_used", confidence: 0.86, requiresReview: true, explanation: "Existing savings are not new income." };
    if (/salary|payroll/i.test(text)) return { category: "Income", semanticType: "income", confidence: 0.99, requiresReview: false, explanation: "Salary/payroll is earned income." };
    if (/interest received|interest credit|fd interest|deposit interest/i.test(text)) return { category: "Income", semanticType: "income", confidence: 0.98, requiresReview: false, explanation: "Interest received is actual income." };
    if (/rent received|rental income/i.test(text)) return { category: "Income", semanticType: "income", confidence: 0.97, requiresReview: false, explanation: "Rent received is income." };
    if (/refund|cashback/i.test(text)) return { category: "Income", semanticType: "income", confidence: 0.82, requiresReview: true, explanation: "Refund/cashback is money received but may be a reversal of an earlier expense." };
    return { category: "Income", semanticType: "income", confidence: 0.86, requiresReview: true, explanation: "Incoming transaction detected; confirm whether it is salary, interest, refund, investment proceeds, or another source." };
  }

  // Strong semantic categories before generic merchant rules.
  if (/\bemi\b|loan repayment|loan instalment|loan installment|mortgage|home loan|car loan/i.test(text)) {
    const confidence = 0.94;
    return { category: "EMI / Loans", semanticType: "emi", confidence, requiresReview: review(amount, confidence), explanation: "Loan/EMI payment is a financial commitment and should be tracked separately from lifestyle spending." };
  }
  if (/mutual fund|\bsip\b|zerodha|groww|upstox|coin|demat|\bfd\b|fixed deposit|recurring deposit/i.test(text)) {
    const confidence = 0.92;
    return { category: "Investment", semanticType: "investment", confidence, requiresReview: review(amount, confidence), explanation: "Investment contribution moves money into an asset rather than ordinary consumption." };
  }
  if (chit.test(text)) return { category: "Investment", semanticType: "chit_contribution", confidence: 0.92, requiresReview: review(amount, 0.92), explanation: "Chit contribution is tracked as a financial commitment/asset movement." };

  for (const [category, pattern] of rules) {
    if (pattern.test(text)) {
      const confidence = category === "Transfer" ? 0.99 : category === "Investment" || category === "EMI / Loans" ? 0.91 : 0.94;
      const semanticType: SemanticTransactionType = category === "Transfer" ? "transfer" : category === "Cash Withdrawal" ? "cash_withdrawal" : category === "Investment" ? "investment" : category === "EMI / Loans" ? "emi" : "expense";
      return { category, semanticType, confidence, requiresReview: review(amount, confidence), explanation: `${category} classification matched the transaction description.` };
    }
  }

  if (amount >= 50000) return { category: "Other", semanticType: isDebitDirection ? "unknown" : "unknown", confidence: 0.45, requiresReview: true, explanation: "Large or unusual transaction with no reliable category match; ask before treating it as ordinary spending." };
  return { category: "Other", semanticType: isDebitDirection ? "expense" : "unknown", confidence: 0.35, requiresReview: true, explanation: "No reliable category match; keep it under review rather than guessing." };
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
