# Why Twilio ignores your incoming SMS webhook

Your incoming SMS webhook isn't firing because Twilio has **multiple webhook routing paths** that can silently override your configuration. The most common culprits are Messaging Service priority conflicts, Twilio Conversations intercepting messages before webhooks fire, or—for Supabase Edge Functions specifically—JWT authentication blocking Twilio's requests with a 401 error.

When outbound SMS works but incoming webhooks fail, Twilio is either routing messages elsewhere (Conversations), using a different webhook URL (Messaging Service override), or your endpoint is rejecting the request before your code runs. Here's how to diagnose and fix each scenario.

## Messaging Service vs Phone Number webhook priority

The **`use_inbound_webhook_on_number`** setting is the most overlooked cause of silent webhook failures. When a phone number belongs to a Messaging Service, this boolean determines which webhook actually fires:

- **If `true`**: Phone number's own webhook takes priority
- **If `false`**: Messaging Service's `inbound_request_url` is used instead
- **If `inbound_request_url` is null on the Messaging Service**: Receiving inbound messages is **disabled entirely**—messages appear in logs but no webhook fires

The default Messaging Service setting is "Defer to sender's webhook," but if this was changed or if `inbound_request_url` was cleared, incoming messages silently go nowhere. Check your Messaging Service configuration at **Messaging → Services → [Your Service] → Integration** and verify both the `inbound_request_url` value and the `use_inbound_webhook_on_number` toggle match your intended behavior.

## Twilio Conversations hijacks messages before webhooks fire

If you've ever used Twilio Conversations, it may be intercepting your incoming SMS. When a Conversation Participant binding exists between a sender's number and your Twilio number, **all incoming messages from that number pair route to Conversations instead of triggering Programmable Messaging webhooks**.

This is documented Twilio behavior: "If the Message belongs in a Conversation, the Conversation captures it first." Your standard SMS webhook will not fire for these messages. Check the **Conversations Console** for any active Conversation Participants binding to your phone number. Deleting the Conversation Participant immediately restores normal webhook behavior.

Additionally, if **Autocreation** is enabled on your Conversations Address Configuration, new SMS exchanges may automatically create Conversation bindings. After disabling Autocreation, changes take up to 60 seconds to take effect.

## Supabase Edge Functions require JWT bypass

For Supabase Edge Functions specifically, the most common failure is **401 Unauthorized errors** caused by Supabase's default JWT verification. Twilio cannot provide a Supabase JWT when calling your webhook, so the function rejects the request before your code executes.

This manifests as Error 11200 ("HTTP retrieval failure") in Twilio's debugger, but your function logs may show nothing because the rejection happens at the platform level. The fix requires disabling JWT verification:

**Option 1 - config.toml (recommended):**
```toml
[functions.your-webhook-function]
verify_jwt = false
```

**Option 2 - CLI deployment:**
```bash
supabase functions deploy your-webhook-function --no-verify-jwt
```

**Option 3 - Dashboard:** Navigate to Edge Functions → Select function → Details → Disable "Verify JWT"

After disabling JWT verification, implement Twilio signature validation within your function for security. Also note that Supabase stores phone numbers **without** the "+" prefix while Twilio sends E.164 format with it—strip the prefix when querying users.

## Webhook filtering and global settings

Webhooks can be disabled at multiple levels without obvious indication:

- **Global webhook filtering**: Check **Conversations → Settings** for webhook filtering toggles
- **Service-level filtering**: Individual Messaging Services can have webhooks disabled
- **Phone number configuration blank**: The "A Message Comes In" field may be empty even though you configured it elsewhere

The Twilio documentation explicitly states: "Webhooks will not fire if you disable them globally or at the service level." Verify settings at both the global Console level and within each Messaging Service.

## Response requirements that cause silent failures

Even if Twilio reaches your webhook, improper responses cause failures that may not appear in your application logs:

| Requirement | Impact if violated |
|-------------|-------------------|
| **Response within 15 seconds** | Error 11200 - connection timeout |
| **Return 2xx status code** | Triggers retry, eventually fails |
| **Valid TwiML or empty response** | May cause unpredictable behavior |
| **No self-signed SSL certificates** | Twilio refuses connection |
| **Public URL (not localhost)** | No connection possible |

For Supabase Edge Functions, return responses quickly. If you need async processing, acknowledge immediately with a 200 response and process in the background:

```typescript
return new Response('<Response></Response>', {
  status: 200,
  headers: { 'Content-Type': 'text/xml' }
});
```

## Diagnostic checklist for your specific scenario

Since outbound SMS works and your webhook URL tests correctly, systematically check these in order:

1. **Check Twilio Debugger** (Monitor → Logs → Errors) for any 11200, 401, or timeout errors when receiving test SMS
2. **Verify Programmable Messaging Logs** show incoming messages with "received" status—if messages appear here, Twilio received them but webhook failed
3. **Inspect Messaging Service settings** if number is in a Messaging Service—check `use_inbound_webhook_on_number` and `inbound_request_url` values
4. **Search Conversations Participants** for bindings to your Twilio number that could intercept messages
5. **Confirm phone number's webhook** at Phone Numbers → Manage → Active Numbers → [Your Number] → "A Message Comes In" field
6. **For Supabase**: Verify `verify_jwt = false` in config.toml and redeploy the function
7. **Test with RequestBin or webhook.site** temporarily to isolate whether Twilio is calling *any* webhook

## What "no attempt" actually means

If Twilio's logs show literally zero attempt to call your webhook (no requests, no errors), the message is being routed elsewhere before reaching your configured endpoint. This is almost always one of:

- **Conversations binding** intercepting the message
- **Messaging Service** with `inbound_request_url = null` dropping the message
- **Messaging Service** calling a different URL than expected due to `use_inbound_webhook_on_number` setting
- **Messages not reaching Twilio** at all (carrier-level issue—rare for domestic US SMS)

If Twilio shows attempts with failures, the issue is your endpoint rejecting requests—most likely JWT verification for Supabase, SSL issues, or timeout problems.

## Conclusion

The three highest-probability causes for your scenario are: **Messaging Service priority conflicts** silently routing to a different or null webhook URL, **Twilio Conversations** intercepting messages before webhooks fire, and **Supabase JWT verification** blocking Twilio's requests. Check the Twilio Debugger first—if you see 11200 errors, Twilio is attempting delivery but failing; if you see nothing, messages are being routed elsewhere entirely. The Messaging Service `inbound_request_url` being null or Conversations bindings are the most likely explanations when Twilio shows zero webhook attempts despite correct phone number configuration.