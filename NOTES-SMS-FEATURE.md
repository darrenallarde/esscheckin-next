# SMS Feature Implementation Notes

## Session Date: December 2024

---

## What We're Building

A direct SMS messaging system from the pastoral dashboard that:
1. Sends from YOUR personal phone number (not a Twilio number)
2. Allows individual texting from student cards
3. Allows bulk/group texting with segmentation
4. Receives replies back into the app
5. Supports texting parents as well as students

---

## Key Decisions Made

| Decision | Choice |
|----------|--------|
| Sending number | Your personal number (NOT Twilio) |
| Replies | Come back into the app |
| Who can send | Just you (admin only) |
| Cost priority | Cheapest option |
| Segmentation | By grade, gender, school, belonging status |
| Parents | Yes, include parent messaging |

---

## Technical Approach: Phone Gateway

Since Twilio/all SMS APIs cannot send from personal numbers (carrier restriction), we'll use your phone as the SMS gateway.

### How It Works

```
Web App (esscheckin)          Your Phone              Student
      │                           │                      │
      │  1. Queue message         │                      │
      │ ─────────────────────►    │                      │
      │                           │  2. Send SMS         │
      │                           │ ──────────────────►  │
      │                           │                      │
      │                           │  3. Receive reply    │
      │                           │ ◄──────────────────  │
      │  4. Webhook to app        │                      │
      │ ◄─────────────────────    │                      │
      │                           │                      │
```

### Android vs iPhone

**Android (Recommended):**
- Use SMS Gateway app (free)
- Full two-way sync
- Runs in background
- API access to send/receive

**iPhone (Limited):**
- Apple restricts background SMS access
- Would need a cheap Android phone as dedicated gateway (~$50)
- Or accept a Twilio number with your signature instead

**QUESTION TO ANSWER:** Are you on Android or iPhone?

---

## UX Design

### 1. Individual Texting (From Student Card)

The "Quick Message" button already exists. We enhance it:
- Click → Opens SMS composer
- Pre-filled message based on student status
- [Send SMS] button → Sends via phone gateway
- Auto-logs as interaction
- Shows delivery status

### 2. Segment Builder

New UI for bulk messaging:

```
┌─────────────────────────────────────────────────────────────┐
│  📱 New Message                                             │
├─────────────────────────────────────────────────────────────┤
│  Grade:    [6] [7] [8] [9] [10] [11] [12] [All]            │
│  Gender:   [Male] [Female] [All]                            │
│  School:   [▼ Select schools...]                            │
│  Status:   [Missing] [Fringe] [Connected] [Core] [All]     │
│  Contact:  [Students] [Parents] [Both]                      │
├─────────────────────────────────────────────────────────────┤
│  📊 23 recipients match                                     │
│  [Preview List]  [Compose Message →]                        │
└─────────────────────────────────────────────────────────────┘
```

### 3. Bulk Message Composer

```
┌─────────────────────────────────────────────────────────────┐
│  Message (23 recipients)                                    │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Hey {first_name}! Youth group is Wednesday at 7pm.    ││
│  │ Hope to see you there!                                 ││
│  │                                                        ││
│  │ - Pastor Darren                                        ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  Merge fields: {first_name} {student_name} {parent_name}   │
│                                                             │
│  [Send 23 Messages]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 4. Reply Inbox

New section showing incoming replies:

```
┌─────────────────────────────────────────────────────────────┐
│  📥 Replies                                      [Refresh]  │
├─────────────────────────────────────────────────────────────┤
│  Sarah Chen (2 min ago)                                     │
│  "Thanks! I'll be there Wednesday!"                         │
│  [Reply] [View Student]                                     │
├─────────────────────────────────────────────────────────────┤
│  Jake's Mom (15 min ago)                                    │
│  "Jake has been sick but should be back next week"          │
│  [Reply] [View Student]                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema (To Add)

```sql
-- SMS Messages table
CREATE TABLE sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  student_id uuid REFERENCES students(id),
  recipient_type text, -- 'student' | 'parent'
  recipient_phone text NOT NULL,
  recipient_name text,

  -- Message
  direction text NOT NULL, -- 'outbound' | 'inbound'
  message_body text NOT NULL,

  -- Tracking
  status text DEFAULT 'queued', -- 'queued' | 'sent' | 'delivered' | 'failed'
  gateway_message_id text, -- ID from phone gateway

  -- Batch (for group messages)
  batch_id uuid,

  -- Link to interaction log
  interaction_id uuid REFERENCES interactions(id),

  -- Timestamps
  created_at timestamp DEFAULT now(),
  sent_at timestamp,
  delivered_at timestamp
);

-- Index for inbox view
CREATE INDEX idx_sms_messages_inbound ON sms_messages(direction, created_at DESC)
  WHERE direction = 'inbound';
```

---

## Implementation Phases

### Phase 1: Phone Gateway Setup
- [ ] Determine Android vs iPhone
- [ ] Install SMS Gateway app on phone
- [ ] Configure API access
- [ ] Test sending a message

### Phase 2: Individual SMS from Card
- [ ] Create sms_messages table
- [ ] Build Supabase Edge Function for queuing messages
- [ ] Update Quick Message UI with "Send SMS" button
- [ ] Implement send flow
- [ ] Auto-log as interaction

### Phase 3: Segment Builder & Bulk Messaging
- [ ] Build segment filter UI
- [ ] Preview recipients list
- [ ] Bulk composer with merge fields
- [ ] Progress tracking for bulk sends
- [ ] Rate limiting (avoid carrier blocks)

### Phase 4: Reply Inbox
- [ ] Set up webhook endpoint for incoming messages
- [ ] Build inbox UI
- [ ] Link replies to students
- [ ] Quick reply functionality

### Phase 5: Parent Messaging
- [ ] Add parent selection to segment builder
- [ ] Handle multiple parents per student
- [ ] Parent-specific merge fields

---

## Environment Variables Needed

```
# Phone Gateway (TBD based on which app)
SMS_GATEWAY_API_URL=
SMS_GATEWAY_API_KEY=

# Your phone number (for display/reference)
ADMIN_PHONE_NUMBER=
```

---

## What's Already Done

1. ✅ Vercel deployment working
2. ✅ SPA routing fixed
3. ✅ Pastoral workflow system (interactions, notes, context panel)
4. ✅ Quick Message UI exists (needs SMS integration)
5. ✅ Student data has phone numbers and parent info

---

## Next Steps When You Return

1. Tell me: **Android or iPhone?**
2. I'll give you the exact gateway app to install
3. We'll test a single message
4. Then build out the full feature

---

## Other Topics Discussed (For Later)

- **Next.js Migration**: You mentioned wanting to move from Vite to Next.js. Deferred for now.
- **Gender Field**: Need to add to student data for segmentation. Deferred for now.
