import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function validSignature(raw: string, signature: string | null) {
  const secret = process.env.SETU_AA_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("base64");
  const a = Buffer.from(signature, "base64");
  const b = Buffer.from(expected, "base64");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-setu-signature"))) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  try {
    const payload = JSON.parse(raw) as {
      type?: string;
      consentId?: string;
      data?: { status?: string; detail?: { accounts?: Array<{ maskedAccNumber?: string; accType?: string; fipId?: string; fiType?: string; linkRefNumber?: string }> } };
      dataSessionId?: string;
      status?: string;
    };
    if (!payload.consentId) return NextResponse.json({ ok: true });

    const admin = createAdminClient();
    const { data: connection } = await admin.from("bank_connections").select("id,user_id").eq("provider", "setu").eq("provider_consent_id", payload.consentId).maybeSingle();
    if (!connection) return NextResponse.json({ ok: true });

    const statusMap: Record<string, string> = { ACTIVE: "active", REJECTED: "rejected", REVOKED: "revoked", PAUSED: "paused", EXPIRED: "expired", PENDING: "pending" };
    const status = payload.data?.status ? statusMap[payload.data.status] || "error" : undefined;
    const accounts = payload.data?.detail?.accounts || [];
    const first = accounts[0];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (first) {
      updates.provider_account_id = first.linkRefNumber || null;
      updates.fip_id = first.fipId || null;
      updates.account_type = first.accType || null;
      updates.masked_account_number = first.maskedAccNumber || null;
    }
    await admin.from("bank_connections").update(updates).eq("id", connection.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
