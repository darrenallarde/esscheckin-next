# AI-Powered Pastoral Recommendation System
## Architecture & Implementation Plan

### System Overview

This system generates Christ-centered, developmentally-appropriate pastoral recommendations by combining:
1. **Current Teaching Curriculum** - What you're teaching this week
2. **Student Phase Data** - Where they are developmentally (Orange/ParentCue phases)
3. **Engagement Patterns** - Check-in data and belonging spectrum
4. **Personal Context** - Age, grade, gender, interests, spiritual journey

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PASTORAL DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │ Current Teaching │───>│   AI Recommendation Engine    │  │
│  │   (Curriculum)   │    │                               │  │
│  └──────────────────┘    │  • Phase Analysis             │  │
│                           │  • Engagement Context         │  │
│  ┌──────────────────┐    │  • Biblical Grounding         │  │
│  │  Student Data    │───>│  • Personalization            │  │
│  │  • Demographics  │    │                               │  │
│  │  • Phase         │    └──────────────┬────────────────┘  │
│  │  • Engagement    │                   │                   │
│  │  • Spiritual     │                   ↓                   │
│  └──────────────────┘    ┌──────────────────────────────┐  │
│                           │  Pastoral Recommendation      │  │
│                           │  • Key Insight                │  │
│                           │  • 3 Action Bullets           │  │
│                           │  • Context Paragraph          │  │
│                           └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Additions

#### Table: `curriculum_weeks`
```sql
CREATE TABLE curriculum_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_date DATE NOT NULL,
  series_name TEXT NOT NULL,
  topic_title TEXT NOT NULL,
  main_scripture TEXT NOT NULL,

  -- Theological Anchoring
  core_truths TEXT[], -- Array of selected core truths
  faith_skills TEXT[], -- Array: 'Hear', 'Pray', 'Talk', 'Live'
  key_biblical_principle TEXT NOT NULL,

  -- Phase Content
  target_phases TEXT[], -- Array: '6th', '7th', '8th', etc.
  big_idea TEXT NOT NULL,
  phase_relevance JSONB, -- { "6th": "why it matters...", "7th": "..." }

  -- Teaching Content
  discussion_questions JSONB, -- { "6th": ["q1", "q2"], "7th": [...] }
  application_challenge TEXT NOT NULL,
  memory_verse TEXT,

  -- Parent Partnership
  parent_communication TEXT,
  home_conversation_starter TEXT,
  prayer_focus TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_current BOOLEAN DEFAULT false -- Only one can be true
);

CREATE INDEX idx_curriculum_current ON curriculum_weeks(is_current) WHERE is_current = true;
```

#### Table: `student_profiles_extended`
```sql
CREATE TABLE student_profiles_extended (
  student_id UUID PRIMARY KEY REFERENCES students(id),

  -- Phase Information
  current_phase TEXT, -- e.g., "6th Grade - Who Cares"
  phase_description TEXT,

  -- Spiritual Journey
  spiritual_maturity TEXT, -- 'Exploring', 'Growing', 'Strong Believer', 'Leadership Ready'
  faith_background TEXT, -- 'New to faith', 'Churched background', 'Unchurched'
  recent_spiritual_notes TEXT,

  -- Personal Context
  interests TEXT[],
  learning_style TEXT, -- 'Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing'
  current_challenges TEXT[],
  family_context TEXT,

  -- Gender (for phase-specific recommendations)
  gender TEXT, -- 'Male', 'Female', 'Prefer not to say'

  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `ai_recommendations`
```sql
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  curriculum_week_id UUID REFERENCES curriculum_weeks(id),

  -- Recommendation Content
  key_insight TEXT NOT NULL,
  action_bullets TEXT[] NOT NULL, -- 3 items
  context_paragraph TEXT NOT NULL,

  -- Metadata
  generated_at TIMESTAMP DEFAULT NOW(),
  engagement_status TEXT, -- Snapshot of their status when generated
  days_since_last_seen INTEGER,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP
);
```

### AI Recommendation Prompt Structure

```javascript
const generateRecommendationPrompt = (student, curriculum, engagement) => {
  return `
You are a Christ-centered youth ministry AI assistant helping pastors provide personalized, developmentally-appropriate follow-up with students.

## THEOLOGICAL FOUNDATION
All recommendations must flow from:
1. Love God (Matthew 22:37)
2. Love Others (Matthew 22:39)
3. Love Yourself (Understanding identity in Christ)

Orange's 9 Core Truths: ${curriculum.core_truths.join(', ')}
Faith Skills Focus: ${curriculum.faith_skills.join(', ')}

## CURRENT TEACHING CONTEXT
Series: ${curriculum.series_name}
Topic: ${curriculum.topic_title}
Scripture: ${curriculum.main_scripture}
Big Idea: ${curriculum.big_idea}
Key Biblical Principle: ${curriculum.key_biblical_principle}
Application Challenge: ${curriculum.application_challenge}

## STUDENT CONTEXT
Name: ${student.first_name}
Phase: ${student.current_phase}
Phase Reality: ${getPhaseDescription(student.grade)}
Gender: ${student.gender}
Spiritual Maturity: ${student.spiritual_maturity}
Interests: ${student.interests?.join(', ') || 'Unknown'}

## ENGAGEMENT CONTEXT
Status: ${engagement.belonging_status}
Last Seen: ${engagement.days_since_last_seen} days ago
Attendance Trend: ${engagement.is_declining ? 'Declining' : 'Stable'}
8-Week Check-ins: ${engagement.total_checkins_8weeks}
Wednesday/Sunday Split: ${engagement.wednesday_count}W / ${engagement.sunday_count}S

## YOUR TASK
Generate a pastoral recommendation that:
1. Connects the current teaching to this student's specific situation
2. Accounts for their developmental phase and engagement level
3. Provides actionable, Christ-centered next steps
4. Is authentic, warm, and pastoral in tone

## OUTPUT FORMAT
Provide exactly:
1. **Key Insight** (1 sentence, max 120 characters)
   - What's the ONE most important thing to know about following up with this student right now?

2. **Action Steps** (3 bullets, each max 80 characters)
   - Specific, actionable things the pastor can do this week
   - Phase-appropriate and engagement-appropriate

3. **Context Paragraph** (2-4 sentences)
   - Important background or considerations
   - Why these actions matter for THIS student
   - How this connects to their phase and the current teaching

## PHASE-SPECIFIC GUIDANCE

${getPhaseSpecificGuidance(student.grade)}

## ENGAGEMENT-SPECIFIC GUIDANCE

${getEngagementSpecificGuidance(engagement.belonging_status, engagement.days_since_last_seen)}

Generate the recommendation now as JSON:
{
  "key_insight": "...",
  "action_bullets": ["...", "...", "..."],
  "context_paragraph": "..."
}
`;
};

const getPhaseDescription = (grade) => {
  const phases = {
    '6': `6th Grade "Who Cares" Phase:
- Questioning relevance of faith and everything else
- Rapid physical changes, hormonal beginnings
- Transitioning from concrete to abstract thinking
- Friends becoming more important than family
- High self-consciousness and mood swings
- Need to see faith as relevant to real life`,

    '7': `7th Grade "Who's Going?" Phase:
- Peer group is everything, social survival mode
- Peak awkwardness and self-consciousness
- Drama and FOMO are intense
- Need for authentic Christian community
- Cliques forming, belonging is crucial
- Faith needs to happen in relational context`,

    '8': `8th Grade "It's Cool to Have Convictions" Phase:
- Starting to own personal beliefs
- More physical and emotional stability
- Friend groups stabilizing
- Leadership qualities emerging
- Ready to explore "why I believe"
- Want to own faith, not just inherit it`,

    '9': `9th Grade "This Is Me Now" Phase:
- Defining identity separate from parents
- Exploring who God made them to be
- Need independence but still need guidance`,

    '10': `10th Grade "Why Not?" Phase:
- Risk-taking and questioning authority
- Exploring boundaries
- Need Biblical wisdom for decisions`,

    '11': `11th Grade "Just Trust Me" Phase:
- Seeking full independence
- Testing leadership skills
- Learning to trust God's guidance`,

    '12': `12th Grade "What's Next?" Phase:
- Future-focused, transition anxiety
- Preparing for next chapter
- Need to understand God's call and purpose`
  };

  return phases[grade] || 'Phase information not available';
};

const getEngagementSpecificGuidance = (status, daysSince) => {
  const guidance = {
    'Ultra-Core': `This student is HIGHLY ENGAGED (2x/week):
- Prime for leadership development
- Can be a peer influencer
- Ready for deeper theological discussions
- May need challenge to grow, not just affirmation`,

    'Core': `This student is CONSISTENTLY ENGAGED (1x/week):
- Solid foundation, encourage consistency
- Ready to invite friends
- Can handle accountability
- Celebrate their faithfulness`,

    'Connected': `This student is PERIODICALLY ENGAGED (2x/month):
- Connection is fragile, needs strengthening
- May have scheduling conflicts or competing interests
- Need to feel missed and valued
- One personal contact could shift them to Core`,

    'On the Fringe': `⚠️ This student is AT RISK (${daysSince} days):
- Immediate outreach needed within 48 hours
- Something changed - need to find out what
- Text or call, not just social media
- Escalate to parent contact if no response`,

    'Missing': `🚨 This student is DISCONNECTED (${daysSince} days):
- Parent contact is essential
- May indicate family crisis or major life change
- Home visit may be appropriate
- Don't give up - they're still your student`
  };

  return guidance[status] || '';
};
```

### Implementation Phases

#### Phase 1: Curriculum Input (Week 1)
- Create curriculum input form/modal
- Database migrations for curriculum_weeks table
- Simple CRUD operations
- Set current week toggle

#### Phase 2: Student Profile Enhancement (Week 2)
- Add phase information to student profiles
- Create admin interface to set phases
- Add spiritual maturity and context fields
- Gender field addition

#### Phase 3: AI Integration (Week 3)
- Set up AI API integration (OpenAI/Anthropic)
- Create recommendation generation function
- Store recommendations in database
- Handle rate limiting and caching

#### Phase 4: Display Integration (Week 4)
- Add recommendations to StudentPastoralCard
- Create expandable recommendation section
- Add dismiss/mark-as-done functionality
- Generate recommendations on-demand or batch

#### Phase 5: Refinement (Week 5)
- Add recommendation history tracking
- Parent communication templates
- Export recommendations for planning
- Analytics on recommendation effectiveness

### Cost & Performance Considerations

**AI API Costs:**
- ~100 students × $0.002 per recommendation = $0.20 per week
- Batch generation: Run once per curriculum week
- Cache recommendations until curriculum changes
- Re-generate only for status changes

**Performance:**
- Generate recommendations asynchronously
- Show cached recommendations instantly
- Refresh button for manual regeneration
- Background job for weekly batch generation

### User Experience Flow

1. **Pastor enters weekly curriculum** (Sunday/Monday)
2. **System generates recommendations** (batch process)
3. **Pastor opens pastoral dashboard** (anytime)
4. **Each student card shows AI recommendation** (expandable)
5. **Pastor can dismiss or mark as completed**
6. **Recommendations update when engagement changes**

### Example Recommendation Output

**Student:** Sarah, 7th Grade Girl, Core Status, Last seen 3 days ago

**Key Insight:** Sarah's consistent attendance during "Who's Going?" phase shows she's found belonging—invite her to bring a friend.

**Action Steps:**
- Text her: "Love your consistency! Want to invite a friend next week?"
- Connect her with another 7th grade girl who needs community
- Challenge her with Proverbs 27:17 about sharpening each other

**Context:** As a 7th grader in the "Who's Going?" phase, peer relationships are everything. Sarah's consistent attendance means she's found her group. This is the perfect time to leverage her sense of belonging to reach her friends. Since we're teaching about [current topic], help her see how being a friend who invites others is living out faith. Her stability makes her a natural peer influencer.

---

This system balances:
- **Theological depth** (rooted in Scripture and proven Orange framework)
- **Developmental appropriateness** (phase-specific insights)
- **Practical action** (specific, doable next steps)
- **Technical efficiency** (cost-effective, performant)
- **Pastoral wisdom** (AI-assisted, not AI-driven)

Should I proceed with implementing Phase 1 (Curriculum Input)?
