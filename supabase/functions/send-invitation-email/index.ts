import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface InvitationEmailRequest {
  to: string;
  organizationName: string;
  inviterName: string;
  role: string;
  loginUrl: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { to, organizationName, inviterName, role, loginUrl }: InvitationEmailRequest = await req.json();

    // Validate required fields
    if (!to || !organizationName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, organizationName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; background-color: #16a34a; border-radius: 8px; padding: 12px;">
      <span style="font-size: 24px;">🐕</span>
    </div>
    <h1 style="color: #16a34a; margin-top: 16px; margin-bottom: 0;">Sheepdoggo</h1>
  </div>

  <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h2 style="margin-top: 0; color: #111;">You're Invited!</h2>
    <p style="margin-bottom: 16px;">
      ${inviterName ? `<strong>${inviterName}</strong> has invited you` : "You've been invited"} to join
      <strong>${organizationName}</strong> on Sheepdoggo${role ? ` as ${role === 'admin' ? 'an admin' : `a ${role}`}` : ''}.
    </p>
    <p style="margin-bottom: 24px;">
      Sheepdoggo helps ministries track attendance and nurture every person's growth.
    </p>
    <a href="${loginUrl || 'https://sheepdoggo.ai/auth'}"
       style="display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
      Accept Invitation
    </a>
  </div>

  <p style="color: #666; font-size: 14px; text-align: center;">
    Simply log in with this email address and you'll automatically be added to the team.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">
    Sheepdoggo · Helping ministries nurture growth
  </p>
</body>
</html>
`;

    const emailText = `
You're Invited to ${organizationName}!

${inviterName ? `${inviterName} has invited you` : "You've been invited"} to join ${organizationName} on Sheepdoggo${role ? ` as ${role === 'admin' ? 'an admin' : `a ${role}`}` : ''}.

Sheepdoggo helps ministries track attendance and nurture every person's growth.

To accept this invitation, visit: ${loginUrl || 'https://sheepdoggo.ai/auth'}

Simply log in with this email address and you'll automatically be added to the team.

--
Sheepdoggo
Helping ministries nurture growth
`;

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Sheepdoggo <hello@sheepdoggo.ai>',
        to: [to],
        subject: `You're invited to join ${organizationName} on Sheepdoggo`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending invitation email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
