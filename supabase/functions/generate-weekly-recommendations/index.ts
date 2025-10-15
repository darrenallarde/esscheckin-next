// Supabase Edge Function to automatically generate AI recommendations
// Scheduled to run: Thursday 6:00 AM and Monday 6:00 AM

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Student {
  student_id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  belonging_status: string;
  total_checkins_8weeks: number;
  days_since_last_seen: number;
  wednesday_count: number;
  sunday_count: number;
  is_declining: boolean;
  attendance_pattern: Array<{ week_start: string; attended: boolean }>;
  parent_name: string | null;
  parent_phone: string | null;
  email: string | null;
  phone_number: string | null;
}

interface Curriculum {
  id: string;
  series_name: string;
  topic_title: string;
  main_scripture: string;
  big_idea: string;
  key_biblical_principle: string;
  application_challenge: string;
  core_truths: string[];
  faith_skills: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Allow calls from:
    // 1. Scheduled cron jobs (with CRON_SECRET)
    // 2. Authenticated Supabase users (the function will check their JWT)
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    let supabase;

    // Check if this is a cron job
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Use service role for cron jobs
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use the user's JWT token for authenticated requests
      const token = authHeader.replace('Bearer ', '');
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      });

      // Verify the user is authenticated and has admin role
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // For now, we'll use service role key for the operations since we verified the user
      // In the future, you could add role checking here
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } else {
      return new Response(JSON.stringify({ error: 'Unauthorized - No valid credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🤖 Starting automated recommendation generation...');

    // 1. Get current curriculum
    const { data: curriculum, error: curriculumError } = await supabase
      .from('curriculum_weeks')
      .select('*')
      .eq('is_current', true)
      .single();

    if (curriculumError || !curriculum) {
      console.error('❌ No current curriculum found');
      return new Response(JSON.stringify({
        error: 'No current curriculum set',
        message: 'Please set a current curriculum week before generating recommendations'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Current curriculum: ${curriculum.topic_title}`);

    // 2. Get all students with pastoral analytics
    const { data: students, error: studentsError } = await supabase
      .rpc('get_pastoral_analytics');

    if (studentsError || !students || students.length === 0) {
      console.error('❌ Error fetching students:', studentsError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch students',
        details: studentsError
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Found ${students.length} students`);

    // 3. Generate recommendations for each student
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const logs: string[] = []; // User-visible logs

    for (let i = 0; i < students.length; i++) {
      const student = students[i] as Student;
      const currentStudent = `${student.first_name} ${student.last_name}`;

      try {
        // Log progress
        const progressLog = `[${i + 1}/${students.length}] Generating for ${currentStudent}...`;
        console.log(progressLog);
        logs.push(progressLog);

        // Fetch extended profile
        const { data: profile } = await supabase
          .from('student_profiles_extended')
          .select('*')
          .eq('student_id', student.student_id)
          .single();

        // Generate recommendation using Claude
        const recommendation = await generateRecommendation(student, profile, curriculum);

        // Save to database (UPSERT to handle duplicates)
        const { error: saveError } = await supabase
          .from('ai_recommendations')
          .upsert({
            student_id: student.student_id,
            curriculum_week_id: curriculum.id,
            key_insight: recommendation.key_insight,
            action_bullets: recommendation.action_bullets,
            context_paragraph: recommendation.context_paragraph,
            engagement_status: student.belonging_status,
            days_since_last_seen: student.days_since_last_seen,
            generated_at: new Date().toISOString()
          }, {
            onConflict: 'student_id,curriculum_week_id',
            ignoreDuplicates: false // Update existing
          });

        if (saveError) {
          throw saveError;
        }

        successCount++;
        const successLog = `✅ [${i + 1}/${students.length}] ${currentStudent}`;
        console.log(successLog);
        logs.push(successLog);

        // Rate limiting: wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errorCount++;
        const errorMsg = `❌ [${i + 1}/${students.length}] ${currentStudent}: ${error.message}`;
        errors.push(errorMsg);
        logs.push(errorMsg);
        console.error(errorMsg);
      }
    }

    const result = {
      success: true,
      message: `Generated ${successCount} recommendations`,
      curriculum: curriculum.topic_title,
      total_students: students.length,
      successful: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined,
      logs: logs, // Include all logs for user visibility
      timestamp: new Date().toISOString()
    };

    console.log('✅ Recommendation generation complete:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateRecommendation(student: Student, profile: any, curriculum: Curriculum) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const prompt = buildPrompt(student, profile, curriculum);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Claude API Error:', JSON.stringify(errorData, null, 2));
    throw new Error(`Claude API error: ${JSON.stringify(errorData.error || errorData)}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Parse JSON response
  let cleanText = content.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/```json\n?/, '').replace(/\n?```$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/```\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(cleanText);

  if (!parsed.key_insight || !Array.isArray(parsed.action_bullets) || !parsed.context_paragraph) {
    throw new Error('Invalid response structure from AI');
  }

  if (parsed.action_bullets.length !== 3) {
    throw new Error('Must have exactly 3 action bullets');
  }

  return {
    key_insight: parsed.key_insight,
    action_bullets: parsed.action_bullets as [string, string, string],
    context_paragraph: parsed.context_paragraph
  };
}

function buildPrompt(student: Student, profile: any, curriculum: Curriculum): string {
  const grade = student.grade || 'Unknown';
  const gradeNum = parseInt(grade);
  const isHighSchool = gradeNum >= 9;

  return `You are a Christ-centered youth ministry AI assistant. Generate a specific, actionable pastoral recommendation.

## DEVELOPMENTAL PHASE
${isHighSchool ? 'HIGH SCHOOL' : 'MIDDLE SCHOOL'} - ${grade}th grade
${isHighSchool
  ? 'Strategy: Need independence, challenge, leadership opportunities. Treat as adults, not kids.'
  : 'Strategy: High energy, peer-focused, make faith tangible and relevant to daily life.'}
${profile?.gender ? `Gender: ${profile.gender} - ${profile.gender === 'Male' ? 'Approach with challenge and purpose' : 'Approach with relational depth and safety'}` : ''}

## CURRENT TEACHING
Series: ${curriculum.series_name}
Topic: ${curriculum.topic_title}
Scripture: ${curriculum.main_scripture}
Big Idea: ${curriculum.big_idea}
Application: ${curriculum.application_challenge}

## STUDENT: ${student.first_name} ${student.last_name}
Grade: ${grade}
Status: ${student.belonging_status}
8-Week Check-ins: ${student.total_checkins_8weeks}/16 possible
Wed/Sun Split: ${student.wednesday_count}W / ${student.sunday_count}S
Days Since Last Seen: ${student.days_since_last_seen === 999999 ? 'Never' : student.days_since_last_seen}
Trend: ${student.is_declining ? 'DECLINING ⚠️' : 'Stable'}
Pattern: ${student.attendance_pattern.map(w => w.attended ? '✓' : '✗').join(' ')}
${student.parent_name ? `Parent: ${student.parent_name} at ${student.parent_phone}` : 'No parent contact'}

## INSTRUCTIONS
Generate SPECIFIC recommendations (not generic):
- Use ${student.first_name}'s actual numbers
- Reference their attendance pattern
- Connect teaching to their life stage
- Give concrete next steps with timelines

Output as JSON:
{
  "key_insight": "One specific insight about THIS student (max 120 chars)",
  "action_bullets": [
    "Specific action 1 (max 80 chars)",
    "Specific action 2 (max 80 chars)",
    "Specific action 3 (max 80 chars)"
  ],
  "context_paragraph": "2-4 sentences explaining WHY these actions matter for ${student.first_name}, connecting their ${student.belonging_status} status and the ${curriculum.topic_title} teaching to their situation."
}`;
}
