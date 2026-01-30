import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Send TwiML response
function twimlResponse(message: string | null): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" }
  });
}

export async function POST(request: NextRequest) {
  // STEP 1: Check env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return twimlResponse(`ENV ERROR: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`);
  }

  // STEP 2: Create Supabase client
  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    return twimlResponse(`SUPABASE ERROR: ${e}`);
  }

  // STEP 3: Parse request
  let from, body;
  try {
    const formData = await request.formData();
    from = formData.get("From") as string;
    body = formData.get("Body") as string;
  } catch (e) {
    return twimlResponse(`PARSE ERROR: ${e}`);
  }

  if (!from || !body) {
    return twimlResponse(`MISSING: from=${!!from}, body=${!!body}`);
  }

  // STEP 4: Test database query
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, slug")
      .limit(1);

    if (error) {
      return twimlResponse(`DB ERROR: ${error.message}`);
    }

    return twimlResponse(`SUCCESS! DB works. Got ${data?.length || 0} orgs. From: ${from}, Body: ${body}`);
  } catch (e) {
    return twimlResponse(`DB EXCEPTION: ${e}`);
  }
}
