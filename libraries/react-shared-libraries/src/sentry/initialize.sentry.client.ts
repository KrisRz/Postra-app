import * as Sentry from '@sentry/nextjs';
import { initializeSentryBasic } from '@gitroom/react/sentry/initialize.sentry.next.basic';

export const initializeSentryClient = (environment: string, dsn: string) =>
  initializeSentryBasic(environment, dsn, {
    integrations: [
      // Add default integrations back
      Sentry.browserTracingIntegration(),
      Sentry.browserProfilingIntegration(),
      Sentry.replayIntegration({
        // GDPR: replays capture whatever the user sees (post drafts, emails),
        // so mask everything and record only when an error actually happens.
        maskAllText: true,
        maskAllInputs: true,
      }),
      Sentry.feedbackIntegration({
        // Disable the injection of the default widget
        autoInject: false,
      }),
      Sentry.replayCanvasIntegration(),
    ],
    // Error-only replays: the free tier includes ~50 replays/month, so recording
    // every session would exhaust the quota within a day.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    profilesSampleRate: environment === 'development' ? 1.0 : 0.1,
  });
