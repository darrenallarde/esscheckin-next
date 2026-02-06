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
  <h2>You're Invited! 🐕</h2>

  <p>Hi there!</p>

  <p>
    ${inviterName ? `<strong>${inviterName}</strong> has invited you` : "You've been invited"} to join
    <strong>${organizationName}</strong> on SheepDoggo${role ? ` as ${role === 'admin' ? 'an admin' : `a ${role}`}` : ''}.
  </p>

  <p style="font-size: 14px; color: #64748b;">
    SheepDoggo helps ministries track attendance and nurture every person's growth.
  </p>

  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
    <a href="${loginUrl || 'https://sheepdoggo.app/auth'}"
       style="display: inline-block; background: #7c3aed; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 16px;">
      Accept Invitation
    </a>
  </div>

  <p style="font-size: 14px; color: #64748b;">
    Just log in with this email address and you'll automatically be added to the team.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="font-size: 12px; color: #94a3b8;">
    If you weren't expecting this invitation, you can safely ignore this email.
  </p>
</body>
</html>
`;

    const emailText = `
You're Invited!

${inviterName ? `${inviterName} has invited you` : "You've been invited"} to join ${organizationName} on SheepDoggo${role ? ` as ${role === 'admin' ? 'an admin' : `a ${role}`}` : ''}.

SheepDoggo helps ministries track attendance and nurture every person's growth.

To accept this invitation, visit: ${loginUrl || 'https://sheepdoggo.app/auth'}

Just log in with this email address and you'll automatically be added to the team.

If you weren't expecting this invitation, you can safely ignore this email.
`;

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'SheepDoggo <hello@sheepdoggo.app>',
        to: [to],
        subject: `You're invited to join ${organizationName} on SheepDoggo`,
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
