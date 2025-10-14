// AI-powered pastoral recommendation generation using Claude

import { CurriculumWeek, StudentProfileExtended } from '@/types/curriculum';
import { StudentPastoralData } from '@/types/pastoral';

// Phase descriptions for AI context
const PHASE_DESCRIPTIONS: Record<string, string> = {
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

// Engagement-specific guidance for AI
const ENGAGEMENT_GUIDANCE: Record<string, string> = {
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

  'On the Fringe': `⚠️ This student is AT RISK:
- Immediate outreach needed within 48 hours
- Something changed - need to find out what
- Text or call, not just social media
- Escalate to parent contact if no response`,

  'Missing': `🚨 This student is DISCONNECTED:
- Parent contact is essential
- May indicate family crisis or major life change
- Home visit may be appropriate
- Don't give up - they're still your student`
};

interface RecommendationInput {
  student: StudentPastoralData;
  studentProfile?: StudentProfileExtended | null;
  curriculum: CurriculumWeek;
}

interface RecommendationOutput {
  key_insight: string;
  action_bullets: [string, string, string];
  context_paragraph: string;
}

export const generateRecommendationPrompt = (input: RecommendationInput): string => {
  const { student, studentProfile, curriculum } = input;

  const grade = student.grade || 'Unknown';
  const phaseDescription = PHASE_DESCRIPTIONS[grade] || 'Phase information not available';
  const engagementGuidance = ENGAGEMENT_GUIDANCE[student.belonging_status] || '';

  return `You are a Christ-centered youth ministry AI assistant helping pastors provide personalized, developmentally-appropriate follow-up with students.

## THEOLOGICAL FOUNDATION
All recommendations must flow from:
1. Love God (Matthew 22:37)
2. Love Others (Matthew 22:39)
3. Love Yourself (Understanding identity in Christ)

Orange's 9 Core Truths: ${curriculum.core_truths.join(', ') || 'Not specified'}
Faith Skills Focus: ${curriculum.faith_skills.join(', ') || 'Not specified'}

## CURRENT TEACHING CONTEXT
Series: ${curriculum.series_name}
Topic: ${curriculum.topic_title}
Scripture: ${curriculum.main_scripture}
Big Idea: ${curriculum.big_idea}
Key Biblical Principle: ${curriculum.key_biblical_principle}
Application Challenge: ${curriculum.application_challenge}

## STUDENT CONTEXT
Name: ${student.first_name}
Grade: ${grade}
Phase: ${studentProfile?.current_phase || `${grade}th Grade`}
Phase Reality: ${phaseDescription}
Gender: ${studentProfile?.gender || 'Unknown'}
Spiritual Maturity: ${studentProfile?.spiritual_maturity || 'Unknown'}
Faith Background: ${studentProfile?.faith_background || 'Unknown'}
Interests: ${studentProfile?.interests?.join(', ') || 'Unknown'}
${studentProfile?.recent_spiritual_notes ? `Recent Notes: ${studentProfile.recent_spiritual_notes}` : ''}

## ENGAGEMENT CONTEXT
Status: ${student.belonging_status}
Last Seen: ${student.days_since_last_seen === 999999 ? 'Never' : `${student.days_since_last_seen} days ago`}
Attendance Trend: ${student.is_declining ? '📉 DECLINING - This is a red flag!' : '✅ Stable'}
8-Week Check-ins: ${student.total_checkins_8weeks} out of possible 16 (Wed + Sun)
Wednesday/Sunday Split: ${student.wednesday_count} Wednesdays / ${student.sunday_count} Sundays
${student.wednesday_count > student.sunday_count ? '⚠️ More Wed than Sun - may prefer small group over large gathering' : ''}
${student.sunday_count > student.wednesday_count ? '✅ Prefers Sunday services over midweek' : ''}
Attendance Pattern (last 8 weeks): ${student.attendance_pattern.map(w => w.attended ? '✓' : '✗').join(' ')}
${student.parent_name ? `Parent Contact Available: ${student.parent_name} at ${student.parent_phone}` : '❌ No parent contact on file'}

${engagementGuidance}

## CRITICAL CONTEXT FOR RECOMMENDATIONS
- Use ${student.first_name}'s actual numbers (${student.total_checkins_8weeks} check-ins, ${student.days_since_last_seen} days since last seen)
- Reference their Wed/Sun preference (${student.wednesday_count}W vs ${student.sunday_count}S)
- ${student.is_declining ? 'Their declining pattern suggests something changed - find out what!' : 'Their stable pattern suggests consistency - build on it!'}
- This week's teaching on "${curriculum.topic_title}" is especially relevant because ${curriculum.application_challenge}

## YOUR TASK
Generate a pastoral recommendation that:
1. Connects the current teaching to this student's specific situation
2. Accounts for their developmental phase and engagement level
3. Provides actionable, Christ-centered next steps
4. Is authentic, warm, and pastoral in tone
5. Is HIGHLY SPECIFIC to THIS student (use their name, reference their actual attendance pattern, mention specific numbers)
6. Avoids generic advice - give concrete, practical next steps based on their actual data
7. References the specific teaching topic and how it applies to their life stage

## OUTPUT FORMAT REQUIREMENTS

You must provide EXACTLY this JSON structure:

{
  "key_insight": "One sentence (max 120 chars) - the ONE most important thing about this student right now",
  "action_bullets": [
    "First action step (max 80 chars, specific and actionable)",
    "Second action step (max 80 chars, specific and actionable)",
    "Third action step (max 80 chars, specific and actionable)"
  ],
  "context_paragraph": "2-4 sentences explaining why these actions matter for THIS student, connecting their phase, engagement status, and the current teaching. Be specific to their situation."
}

## GUIDELINES

**CRITICAL: Be SPECIFIC, not generic. Bad vs Good examples:**
- ❌ BAD: "Reach out to show you care"
- ✅ GOOD: "Text Sarah tonight: 'Hey! Noticed you've been to 5/8 Wednesdays but only 1 Sunday. Miss you on Sunday mornings! Can we grab coffee?'"

- ❌ BAD: "Connect the teaching to their life"
- ✅ GOOD: "This week's message on identity in Christ hits different for 7th graders in peer survival mode. Ask Mark if he feels pressure to fit in at school"

- ❌ BAD: "Encourage them to attend more"
- ✅ GOOD: "Jessica came 3x in first 4 weeks, then dropped to 1x last 4 weeks. Something changed. Call her parents this week to check in"

**For Ultra-Core students (8+ check-ins, both Wed & Sun):**
- Name specific leadership opportunities: "Invite [Name] to co-lead small group starting next month"
- Challenge with advanced discipleship: "Ask [Name] to read [specific book/passage] and discuss it 1-on-1"
- Reference their consistency: "They've been here [X]/8 weeks - they're ready for more"

**For Core students (6-7 check-ins):**
- Celebrate specific wins: "[Name] has been here 6 straight weeks - text them 'Your consistency is inspiring!'"
- Give concrete serving opportunities: "Ask [Name] to help with setup next Wednesday"
- Name specific friends they could invite based on their interests

**For Connected students (3-5 check-ins):**
- Point out the pattern: "[Name] came 4x in first month, 1x this month - what changed?"
- Personal invitation with specifics: "Text [Name] Tuesday: 'This Sunday we're doing [activity]. Would love to see you!'"
- Mention what they've missed: "They missed the [specific series] - might not feel caught up"

**For "On the Fringe" students (30-59 days absent):**
- URGENT with timeline: "Call [Name] by Friday latest"
- Reference last attendance: "Last here [specific date] - [X] days ago"
- Specific conversation starter: "Ask: 'Haven't seen you since [date]. Everything okay? We miss you!'"
- Parent escalation plan: "If no response by [day], call mom/dad"

**For "Missing" students (60+ days absent):**
- Parent contact is FIRST step: "Call [Parent Name] at [number] this week"
- Reference the gap: "Last attendance was [date] - [X] days ago. Something major likely happened"
- Home visit consideration: "If parents are receptive, offer to visit [Name] at home"
- Specific re-engagement plan: "Don't just invite back - find out what happened first"

**Phase-Specific Approaches:**
- 6th Grade: Make it relevant and practical, short attention span
- 7th Grade: Emphasize community and belonging, peer connections
- 8th Grade: Help them own their faith, apologetics, "why I believe"
- 9th-12th Grade: Increasing independence, identity formation, future focus

Generate the recommendation now as valid JSON (no markdown, just the JSON object):`;
};

export const parseAIResponse = (responseText: string): RecommendationOutput => {
  try {
    // Remove markdown code blocks if present
    let cleanText = responseText.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(cleanText);

    // Validate structure
    if (!parsed.key_insight || !Array.isArray(parsed.action_bullets) || !parsed.context_paragraph) {
      throw new Error('Invalid response structure');
    }

    if (parsed.action_bullets.length !== 3) {
      throw new Error('Must have exactly 3 action bullets');
    }

    return {
      key_insight: parsed.key_insight,
      action_bullets: parsed.action_bullets as [string, string, string],
      context_paragraph: parsed.context_paragraph
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Response text:', responseText);
    throw new Error('Failed to parse AI recommendation');
  }
};

export const generateRecommendation = async (
  input: RecommendationInput,
  apiKey: string
): Promise<RecommendationOutput> => {
  const prompt = generateRecommendationPrompt(input);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    return parseAIResponse(content);
  } catch (error) {
    console.error('Error generating recommendation:', error);
    throw error;
  }
};

// Fallback recommendation generator (when API is unavailable or for testing)
export const generateFallbackRecommendation = (input: RecommendationInput): RecommendationOutput => {
  const { student, curriculum } = input;

  const actionsByStatus: Record<string, [string, string, string]> = {
    'Ultra-Core': [
      `Invite ${student.first_name} to a leadership development conversation`,
      `Challenge them with deeper study on ${curriculum.topic_title}`,
      `Ask them to mentor a younger or newer student`
    ],
    'Core': [
      `Text ${student.first_name}: "Love seeing you every week!"`,
      `Encourage them to invite a friend to next week's session`,
      `Ask how they're applying ${curriculum.topic_title} in their life`
    ],
    'Connected': [
      `Reach out: "Hey ${student.first_name}! We miss you when you're not here"`,
      `Find out what's preventing more consistent attendance`,
      `Personal invite to upcoming special event`
    ],
    'On the Fringe': [
      `TEXT TODAY: "Hey ${student.first_name}, haven't seen you in a while!"`,
      `Call to check in if no text response within 48 hours`,
      `Contact parents if still no response`
    ],
    'Missing': [
      `Call parents TODAY about ${student.first_name}`,
      `Express concern and ask if everything is okay`,
      `Offer to visit or meet for coffee`
    ]
  };

  const actions = actionsByStatus[student.belonging_status] || [
    `Reach out to ${student.first_name} this week`,
    `Connect their situation to ${curriculum.topic_title}`,
    `Follow up with parents if needed`
  ];

  return {
    key_insight: `${student.first_name} (${student.belonging_status}) needs ${
      student.belonging_status === 'Missing' || student.belonging_status === 'On the Fringe'
        ? 'immediate outreach'
        : student.belonging_status === 'Ultra-Core'
        ? 'leadership development'
        : 'encouragement and connection'
    }.`,
    action_bullets: actions,
    context_paragraph: `As a ${student.grade}th grader in ${student.belonging_status} status, ${student.first_name} needs specific pastoral attention. With ${student.days_since_last_seen} days since last attendance, this is ${
      student.days_since_last_seen > 30 ? 'urgent' : 'important'
    }. Connect this week's teaching on ${curriculum.topic_title} to their specific situation.`
  };
};
