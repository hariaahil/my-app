import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSetuConsent, getSetuAccountAvailability } from "@/lib/setu-aa";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const body = await request.json() as { mobileNumber?: string };
    const mobile = (body.mobileNumber || "").replace(/\D/g, "");
    if (!/^\d{10}$/.test(mobile)) return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });

    const availability = await getSetuAccountAvailability(mobile);
    const accounts = Array.isArray(availability?.accounts) ? availability.accounts : [];
    const available = accounts.find((a: { status?: boolean }) => a.status)?.vua;
    if (!available) return NextResponse.json({ error: "No Account Aggregator account is currently available for this mobile number." }, { status: 422 });

    const now = new Date();
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 1);
    const consent = await createSetuConsent({ vua: available, from: from.toISOString(), to: now.toISOString() });
    if (!consent?.id || !consent?.url) throw new Error("Setu did not return a consent URL");

    const { error } = await supabase.from("bank_connections").upsert({
      user_id: user.id,
      provider: "setu",
      provider_consent_id: consent.id,
      status: "pending",
      metadata: { vua: available },
    }, { onConflict: "provider,provider_consent_id" });
    if (error) throw error;

    return NextResponse.json({ consentId: consent.id, url: consent.url, status: consent.status || "PENDING" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start bank connection" }, { status: 500 });
  }
}
