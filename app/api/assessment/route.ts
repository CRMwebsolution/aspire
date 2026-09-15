import { NextResponse } from "next/server";

export const runtime = "nodejs";

const counties = new Set(["Carteret", "Onslow", "Craven", "Other"]);
const vehicles = new Set(["Car / Sedan", "SUV / Truck / Van", "Boat", "Side-by-side", "Motor home / Camper / RV", "Other"]);
const services = new Set(["Exterior Wash", "Exterior Detail Package", "Interior Clean", "Standard Detail", "Interior Detail Package", "Full Detail", "Exterior Re-Condition", "Ceramic / Graphene Coating", "Specialty Vehicle", "Not sure"]);
const requestTypes = new Set(["detailing", "class"]);
const classInterests = new Set(["Level 1 - Basic Core Auto Detailing", "Level 2 - Intermediate", "Level 3 - Advanced", "Master - All three levels", "Not sure"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (clean(body.company, 100)) return NextResponse.json({ ok: true });

    const requestType = clean(body.request_type, 20);

    const payload = {
      request_type: requestType,
      name: clean(body.name, 120),
      phone: clean(body.phone, 30),
      email: clean(body.email, 254) || null,
      county: clean(body.county, 20),
      vehicle_type: requestType === "detailing" ? clean(body.vehicle_type, 50) : null,
      service_interest: requestType === "detailing" ? clean(body.service_interest, 60) : null,
      class_interest: requestType === "class" ? clean(body.class_interest, 80) : null,
      preferred_window: clean(body.preferred_window, 160) || null,
      notes: clean(body.notes, 2000) || null,
      consent_to_contact: body.consent_to_contact === true,
      source: "aspire_website",
    };

    const validRequestDetails = requestType === "detailing"
      ? vehicles.has(payload.vehicle_type || "") && services.has(payload.service_interest || "")
      : requestType === "class" && classInterests.has(payload.class_interest || "");

    if (!requestTypes.has(requestType) || payload.name.length < 2 || payload.phone.length < 7 || !counties.has(payload.county) || !validRequestDetails || !payload.consent_to_contact) {
      return NextResponse.json({ ok: false, error: "Please complete the required fields." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ ok: false, error: "The request form is being connected. Please call (252) 269-1517." }, { status: 503 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/aspire_assessment_requests`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Supabase lead insert failed", response.status);
      return NextResponse.json({ ok: false, error: "We could not save your request. Please call (252) 269-1517." }, { status: 502 });
    }

    const n8nWebhook = process.env.N8N_WEBHOOK_URL;
    if (n8nWebhook) {
      try {
        const n8nResponse = await fetch(n8nWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "aspire.assessment.created",
            inquiry_type: payload.request_type,
            submitted_at: new Date().toISOString(),
            lead: payload,
          }),
        });
        if (!n8nResponse.ok) console.error("n8n lead notification failed", n8nResponse.status);
      } catch (error) {
        console.error("n8n lead notification failed", error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Assessment request failed", error);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please call (252) 269-1517." }, { status: 500 });
  }
}
