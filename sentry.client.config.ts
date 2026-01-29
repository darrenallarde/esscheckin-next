// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://9c517b44fd2d0cd96fd549c7ae655229@o4510795845468160.ingest.us.sentry.io/4510795847434240",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay configuration - capture user sessions with errors
  replaysOnErrorSampleRate: 1.0,  // Always capture replay when error occurs
  replaysSessionSampleRate: 0.1, // Sample 10% of sessions for general monitoring

  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
