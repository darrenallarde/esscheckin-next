# SMS Webhook - Continuation Guide

> **Date:** January 29, 2026
> **Status:** WORKING - Full pipeline proven
> **Next Goal:** Simplify back to single Supabase Edge Function

---

## Current Working Architecture

```
Student SMS
    ↓
Twilio (+18334089244)
    ↓
Cloudflare Worker (https://bitter-sun-c46b.darren-738.workers.dev/)
    ↓
Vercel API Route (/api/receive-sms)
    ↓
Supabase Database (production: hhjvsvezinrbxeropeyl)
    ↓
TwiML Response
    ↓
SMS Reply to Student
```

**Proof it works:** Sent SMS "lots of cool debugging" → Received reply "SUCCESS! DB works. Got 1 orgs. From: +16506413850, Body: lots of cool debugging"

---

## What We Learned

### The Real Issue
We spent hours debugging what we thought was a Twilio → Supabase routing problem. In hindsight:

1. **Twilio was likely calling the Supabase Edge Function all along**
2. The "no HTTP Requests logged" message in Twilio was misleading (wrong UI section or timing)
3. The Edge Function was probably failing silently (no logging visibility)
4. The Cloudflare → Vercel chain gave us **observability**, not a fix

### Key Insight
The problem wasn't infrastructure routing - it was **lack of visibility into what was happening**. Once we could see request/response flow, debugging was fast.

---

## What Already Exists

### 1. Supabase Edge Function (FULL NPC ROUTER)
**Location:** `supabase/functions/receive-sms/index.ts`

This is a complete, sophisticated SMS router that handles:
- Known students → auto-route to their group
- Unknown numbers → welcome message + waiting room
- Org/group codes → connect to ministry
- Commands: HELP, EXIT, SWITCH, GROUPS
- Multi-group selection flow
- Lobby messages for students without groups
- Session management
- Message storage

**Config:** `supabase/config.toml` already has `verify_jwt = false`

### 2. Vercel API Route (SIMPLE DEBUG VERSION)
**Location:** `src/app/api/receive-sms/route.ts`

Currently a simplified test that:
- Checks env vars
- Creates Supabase client
- Parses Twilio form data
- Does a test DB query
- Returns debug message

### 3. Cloudflare Worker (RELAY)
**URL:** `https://bitter-sun-c46b.darren-738.workers.dev/`

Simple relay that forwards to Vercel. Code:
```javascript
export default {
  async fetch(request) {
    const vercelUrl = 'https://esscheckin-next.vercel.app/api/receive-sms';
    const response = await fetch(vercelUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': 'text/xml' },
    });
  },
};
```

---

## Tomorrow's Plan: Simplify to Single Endpoint

### Option A: Test Supabase Edge Function Directly

1. **Update Twilio Messaging Service webhook** to point directly to:
   ```
   https://hhjvsvezinrbxeropeyl.supabase.co/functions/v1/receive-sms
   ```

2. **Check Supabase Edge Function logs:**
   ```
   Use mcp__supabase__get_logs with:
   - project_id: hhjvsvezinrbxeropeyl
   - service: edge-functions
   ```

3. **Send test SMS** and watch logs

4. If it works → delete Cloudflare Worker and Vercel route (simplification complete)

5. If it fails → logs will show exactly why (env vars, DB, parsing, etc.)

### Option B: Keep Vercel, Remove Cloudflare

1. **Update Twilio webhook** to point directly to:
   ```
   https://esscheckin-next.vercel.app/api/receive-sms
   ```

2. **Port the full NPC router** from `supabase/functions/receive-sms/index.ts` to `src/app/api/receive-sms/route.ts`

3. Delete Cloudflare Worker

### Option C: Keep Current Architecture

If simplification causes issues, the current 3-layer architecture works fine. It's slightly more complex but:
- Cloudflare adds geographic edge caching
- Vercel gives us familiar Next.js debugging
- Both have good logging dashboards

---

## Files to Reference

| File | Purpose |
|------|---------|
| `supabase/functions/receive-sms/index.ts` | Full NPC router (Deno/Edge Function) |
| `supabase/config.toml` | Edge Function config (verify_jwt = false) |
| `src/app/api/receive-sms/route.ts` | Current Vercel endpoint (debug version) |
| `troubleshooting/twilioresearch.md` | Research on Twilio webhook issues |

---

## Twilio Configuration Reference

- **Phone Number:** +18334089244
- **Phone SID:** PN44869fce1a5b8ecb23cd2c34f35f3d28
- **Messaging Service SID:** MGe035cbff159ffcd208de3a1522b40488
- **Current Webhook:** Cloudflare Worker URL
- **Setting:** `use_inbound_webhook_on_number: false` (uses Messaging Service URL)

To update webhook via API:
```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/PN44869fce1a5b8ecb23cd2c34f35f3d28.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -d "SmsUrl=NEW_URL_HERE"
```

Or update Messaging Service:
```bash
curl -X POST "https://messaging.twilio.com/v1/Services/MGe035cbff159ffcd208de3a1522b40488" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -d "InboundRequestUrl=NEW_URL_HERE"
```

---

## Quick Start Tomorrow

1. **Read this file** to remember context
2. **Decide: Option A, B, or C** (recommend trying A first - simplest)
3. **Update Twilio webhook** to test endpoint
4. **Send test SMS** to +18334089244
5. **Check logs** (Supabase, Vercel, or Cloudflare depending on setup)
6. **Iterate** based on what logs show

---

## Success Criteria

- Single endpoint handling SMS (no relay chain)
- Full NPC router working (students get personalized responses)
- Messages stored in `sms_messages` table
- Unknown numbers added to `sms_waiting_room`
- Session management working (`sms_sessions` table)

---

*Last updated: January 29, 2026 - Pipeline proven working, ready for simplification*
