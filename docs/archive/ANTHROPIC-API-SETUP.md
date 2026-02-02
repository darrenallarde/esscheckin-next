# Anthropic API Key Setup

## Getting Your API Key

Your Anthropic API key is stored in **Supabase Edge Function secrets**. Here's how to find it or set a new one:

### Option 1: Check Existing Key in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click **Edge Functions** in the sidebar
3. Click **Manage secrets**
4. Look for `ANTHROPIC_API_KEY`

If it's there, you're all set! The Edge Function will use it automatically.

---

### Option 2: Get a New Key from Anthropic

1. Go to https://console.anthropic.com/
2. Log in with your Anthropic account
3. Click **API Keys** in the sidebar
4. Click **Create Key**
5. Give it a name (e.g., "ESS Check-in Production")
6. Copy the key (starts with `sk-ant-api03-...`)

**IMPORTANT:** Copy it now - you won't be able to see it again!

---

### Option 3: Set the Key in Supabase

#### Via Supabase Dashboard (Easiest):
1. Go to your Supabase project dashboard
2. Click **Edge Functions** in the sidebar
3. Click **Manage secrets**
4. Click **Add new secret**
5. Name: `ANTHROPIC_API_KEY`
6. Value: Paste your API key (starts with `sk-ant-api03-...`)
7. Click **Save**

#### Via Supabase CLI (Alternative):
```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set the secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

---

## How the UI Works Now

**✅ Simplified - No more API key input!**

The "Generate AI Recommendations" button now works like this:

1. **Click the button** - Opens a dialog
2. **Two modes:**
   - **AI Mode (default):** Uses Claude AI via Edge Function
     - Automatically uses the API key stored in Supabase secrets
     - Generates personalized, context-aware recommendations
     - Takes ~1-2 minutes for all students

   - **Template Mode (checkbox):** Uses simple templates
     - No AI, no API key needed
     - Instant generation
     - Generic recommendations based on belonging status

3. **That's it!** No API key to enter, no configuration needed.

---

## Troubleshooting

### "Failed to generate recommendations"

**Check:**
1. Is `ANTHROPIC_API_KEY` set in Supabase Edge Function secrets?
2. Is the Edge Function deployed?
   ```bash
   supabase functions list
   # Should show: generate-weekly-recommendations
   ```
3. Does the API key have credits? (Check console.anthropic.com)

### "How do I know if it's working?"

1. Go to Pastoral Dashboard
2. Set a current curriculum week
3. Click "Generate AI Recommendations"
4. Select **AI Mode** (uncheck the template fallback)
5. Click "Generate Recommendations"
6. You should see a progress bar and success message

### "I want to use a different key"

Just update it in Supabase:
1. Dashboard → Edge Functions → Manage secrets
2. Find `ANTHROPIC_API_KEY`
3. Click edit
4. Paste new key
5. Save

---

## Cost Estimation

**Typical usage:**
- ~$0.002 per student recommendation
- For 50 students: ~$0.10
- For 100 students: ~$0.20
- For 200 students: ~$0.40

**Monthly estimate:**
- Weekly generation for 100 students: ~$3.20/month
- Twice-weekly for 100 students: ~$6.40/month

Very affordable! Claude Sonnet 4 is efficient.

---

## Security Notes

✅ **Your API key is secure:**
- Stored in Supabase secrets (encrypted)
- Never exposed to the frontend
- Only accessible to Edge Functions
- Can be rotated anytime

❌ **Never:**
- Commit API keys to git
- Share API keys in Slack/email
- Store in frontend environment variables (VITE_* vars are public)

---

## What Changed

**Before (confusing):**
- UI asked for API key
- Key was never used
- Users confused about where to put it

**After (clean):**
- No API key input in UI
- Everything automatic via Edge Function
- Key stored once in Supabase, works forever
- Checkbox for template mode if you don't want to use AI

---

**🎉 That's it! Your API key is set and forget.**
