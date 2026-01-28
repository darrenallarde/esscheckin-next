/**
 * Copy & Messaging for Sheepdoggo
 *
 * Following our design principles:
 * - Prayer-first language
 * - Encouraging, never clinical
 * - Celebrates progress, doesn't guilt
 * - Uses "we" and "you" - the app is a partner
 */

export const PLATFORM_NAME = 'Sheepdoggo';
export const PLATFORM_TAGLINE = 'Helping ministries shepherd their flock';

/**
 * Empty states - encouraging messages when there's no data
 */
export const EMPTY_STATES = {
  noStudents: {
    title: "Your roster is ready and waiting",
    description: "Import your students or add them one by one - they're excited to connect with you!",
    action: "Add your first student"
  },
  noCheckInsToday: {
    title: "No check-ins yet today",
    description: "Your students are on their way! The check-in page is ready for them.",
    action: "Open check-in page"
  },
  noRecommendations: {
    title: "Everyone's doing great!",
    description: "No urgent pastoral needs right now. Take a moment to celebrate your team's work.",
    action: null
  },
  noGroups: {
    title: "Create your first group",
    description: "Groups help you organize students and track who's connecting regularly.",
    action: "Create a group"
  },
  noTeamMembers: {
    title: "Ministry is better together",
    description: "Invite your team to help shepherd your students. Many hands make light work!",
    action: "Invite a team member"
  },
  importEmpty: {
    title: "Ready to bring your people in",
    description: "Upload a CSV file and we'll help you get everyone set up. It only takes a minute!",
    action: "Choose a file"
  }
};

/**
 * Success messages - celebrate wins
 */
export const SUCCESS_MESSAGES = {
  studentAdded: "Welcome to your roster! Ready to start caring for them?",
  studentUpdated: "Got it! Changes saved.",
  checkInRecorded: "Check-in recorded - great to see them!",
  importComplete: (count: number) =>
    `${count} students are now ready for you to care for them!`,
  inviteSent: "Invitation sent! They'll be part of the team soon.",
  groupCreated: "Group created - time to add some students!",
  recommendationCompleted: "Beautiful! That connection matters more than you know.",
  settingsSaved: "Your changes are live - your team will see them right away!"
};

/**
 * Encouraging labels - caring alternatives to clinical terms
 */
export const LABELS = {
  // Instead of "at risk"
  needsAttention: "Could use some love",
  needsAttentionPlural: "Could use some extra love this week",

  // Instead of "engagement metrics"
  connections: "Who you've connected with",

  // Instead of "retention rate"
  keepingComing: "Students who keep coming back",

  // Instead of "data imported"
  rosterReady: "Your roster is ready",

  // Instead of "task failed"
  tryAgain: "Let's try that again",

  // Check-in related
  checkInPrompt: "Ready to check in? Let's find you!",
  searchPlaceholder: "Name or phone number",

  // Dashboard sections
  todaysPriority: "Who could use some care today",
  recentWins: "Recent connections",
  quickOverview: "This week at a glance"
};

/**
 * Comparative stats - not just numbers, context
 */
export const STAT_CONTEXT = {
  sameAsLastWeek: "About the same - steady is good!",
  upFromLastWeek: (percent: number) => `Up ${percent}% from last week!`,
  downFromLastWeek: (percent: number) => `Down ${percent}% - might be worth exploring`,
  firstWeek: "Your first week - let's see what grows!",
  noComparison: "Building your baseline"
};

/**
 * Prayer prompts - integrated throughout the experience
 */
export const PRAYER_PROMPTS = {
  beforeOutreach: "Take a moment to pray for this conversation",
  forAbsentStudent: (name: string) =>
    `Lord, wherever ${name} is right now, let them know they're loved and missed...`,
  forNewStudent: (name: string) =>
    `God, help ${name} feel welcomed and at home. Give us wisdom to shepherd them well...`,
  forStruggling: (name: string) =>
    `Father, ${name} is going through something hard. Give me the right words and a listening ear...`,
  general: "Lord, give me eyes to see my students the way You see them..."
};

/**
 * Scripture encouragements - for empty states and celebrations
 */
export const SCRIPTURE = {
  shepherding: {
    verse: "The Lord is my shepherd, I lack nothing.",
    reference: "Psalm 23:1"
  },
  patience: {
    verse: "Being confident of this, that he who began a good work in you will carry it on to completion.",
    reference: "Philippians 1:6"
  },
  presence: {
    verse: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    reference: "Joshua 1:9"
  },
  seeds: {
    verse: "I planted the seed, Apollos watered it, but God has been making it grow.",
    reference: "1 Corinthians 3:6"
  },
  love: {
    verse: "And now these three remain: faith, hope and love. But the greatest of these is love.",
    reference: "1 Corinthians 13:13"
  }
};

/**
 * Action confirmations - friendly CTAs
 */
export const ACTIONS = {
  import: {
    start: "Let's bring your people in",
    mapping: "Help us understand your data",
    preview: "Take a look before we import",
    confirm: "Looks good - import them!",
    inProgress: "Importing... almost there!",
    complete: "Welcome to your new roster!"
  },
  invite: {
    prompt: "Ministry is better together - invite your team",
    sent: "Invitation on its way!",
    accepted: "They're part of the team now!"
  }
};

/**
 * Error messages - gentle and solution-focused
 */
export const ERRORS = {
  generic: "Something didn't work quite right. Let's try again.",
  network: "We're having trouble connecting. Check your internet and try again.",
  notFound: "We couldn't find what you're looking for.",
  unauthorized: "You'll need to sign in to do that.",
  noAccess: "You don't have access to this organization. Contact your admin if you think this is a mistake."
};

/**
 * Format a relative time in a friendly way
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'Last week';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return 'Last month';
  return `${Math.floor(diffDays / 30)} months ago`;
}

/**
 * Get a random encouraging phrase for check-in success
 */
export function getCheckInCelebration(): string {
  const celebrations = [
    "Great to see you!",
    "Welcome back!",
    "So glad you're here!",
    "You made it!",
    "Awesome to have you!",
  ];
  return celebrations[Math.floor(Math.random() * celebrations.length)];
}
