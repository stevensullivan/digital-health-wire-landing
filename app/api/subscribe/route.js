import { cookies, headers } from "next/headers";

const WEBHOOK_URL =
  process.env.WEBHOOK_URL ||
  "https://n8n-production-9091.up.railway.app/webhook/update-subscriber";

// Mailchimp audience this landing page subscribes people to (The Bio Wire).
const MAIN_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID || "4d630702b1";

// Cross-subscribe audience ids offered in SubscribeForm. Allowlisted so the
// endpoint can't be used to push arbitrary audiences. Keep in sync with the form.
// NOTE: confirm these against The Bio Wire's Mailchimp account — see SubscribeForm.js.
const CROSS_AUDIENCE_IDS = ["9786e7c7fb", "fee526ecba", "6f44420470"];
const ALLOWED_AUDIENCES = new Set([MAIN_AUDIENCE_ID, ...CROSS_AUDIENCE_IDS]);

const YEAR = 60 * 60 * 24 * 365;
const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: YEAR };

const isEmail = (v) => typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const clean = (v) => String(v || "").trim().slice(0, 200);

// UA + Facebook pixel cookies — captured server-side for ad attribution.
function trackingFields(hdrs, jar) {
  const f = {};
  const ua = hdrs.get("user-agent");
  if (ua) f.UA = ua;
  const fbp = jar.get("_fbp")?.value;
  if (fbp) f.FBP = fbp;
  const fbc = jar.get("_fbc")?.value;
  if (fbc) f.FBC = fbc;
  return f;
}

export async function POST(req) {
  const jar = await cookies();
  const hdrs = await headers();

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const step = body.step;
  // email is the source of truth from the cookie once captured; fall back to the body on step 1
  const email = jar.get("dhw_email")?.value || body.email;
  if (!isEmail(email)) {
    return Response.json({ error: "invalid email" }, { status: 400 });
  }

  const tracking = trackingFields(hdrs, jar);

  // Same webhook for both steps; step 2 adds name + any cross-subscribe audiences.
  let payload;
  if (step === "details") {
    const extra = (Array.isArray(body.newsletters) ? body.newsletters : []).filter(
      (id) => ALLOWED_AUDIENCES.has(id)
    );
    payload = {
      email,
      audienceIds: [...new Set([MAIN_AUDIENCE_ID, ...extra])],
      mergeFields: {
        FNAME: clean(body.firstName),
        LNAME: clean(body.lastName),
        COMPANY: clean(body.company),
        TITLE: clean(body.title),
        ...tracking,
      },
    };
  } else {
    payload = {
      email,
      audienceIds: [MAIN_AUDIENCE_ID],
      mergeFields: tracking,
    };
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
  } catch (e) {
    console.error("subscribe webhook failed:", e);
    return Response.json({ error: "webhook failed" }, { status: 502 });
  }

  jar.set("dhw_email", email, cookieOpts);
  jar.set("dhw_stage", step === "details" ? "registered" : "details", cookieOpts);

  return Response.json({ ok: true });
}
