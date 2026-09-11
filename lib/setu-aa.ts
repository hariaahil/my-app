const SETU_BASE_URL = process.env.SETU_AA_BASE_URL || "https://fiu.setu.co";
const SETU_TOKEN_URL = process.env.SETU_AA_TOKEN_URL || "https://accountservice.setu.co/v1/users/login";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function setuAccessToken() {
  const response = await fetch(SETU_TOKEN_URL, {
    method: "POST",
    headers: { client: "bridge", "content-type": "application/json" },
    body: JSON.stringify({ clientID: required("SETU_AA_CLIENT_ID"), secret: required("SETU_AA_CLIENT_SECRET"), grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Setu authentication failed (${response.status})`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Setu did not return an access token");
  return body.access_token;
}

async function setuFetch(path: string, init: RequestInit = {}) {
  const token = await setuAccessToken();
  const response = await fetch(`${SETU_BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", "x-product-instance-id": required("SETU_AA_PRODUCT_INSTANCE_ID"), ...(init.headers || {}) },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body?.errorMsg === "string" ? body.errorMsg : `Setu request failed (${response.status})`);
  return body;
}

export async function createSetuConsent(input: { vua: string; from: string; to: string }) {
  return setuFetch("/consents", {
    method: "POST",
    body: JSON.stringify({
      consentDuration: { unit: "YEAR", value: 1 },
      vua: input.vua,
      dataRange: { from: input.from, to: input.to },
      consentTypes: ["TRANSACTIONS", "PROFILE", "SUMMARY"],
      consentMode: "STORE",
      fetchType: "PERIODIC",
      dataLife: { unit: "YEAR", value: 1 },
      frequency: { unit: "MONTHLY", value: 1 },
      fiTypes: ["DEPOSIT"],
      purpose: { code: "102", text: "Customer spending patterns, budget or other reportings", refUri: "https://api.rebit.org.in/aa/purpose/102.xml" },
      context: [{ key: "accountSelectionMode", value: "multi" }, { key: "purposeCode", value: "102" }],
    }),
  });
}

export async function getSetuAccountAvailability(mobileNumber: string) {
  return setuFetch("/v2/account-availability", { method: "POST", body: JSON.stringify({ mobileNumber }) });
}

export async function getSetuConsent(consentId: string) {
  return setuFetch(`/consents/${encodeURIComponent(consentId)}?expanded=true`, { method: "GET" });
}

export async function createSetuDataSession(consentId: string, from: string, to: string) {
  return setuFetch("/sessions", { method: "POST", body: JSON.stringify({ consentId, dataRange: { from, to }, format: "json" }) });
}
