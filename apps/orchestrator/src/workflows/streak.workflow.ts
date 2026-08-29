import { proxyActivities, sleep } from '@temporalio/workflow';
import { EmailActivity } from '@gitroom/orchestrator/activities/email.activity';

const { setStreak } = proxyActivities<EmailActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  cancellationType: 'ABANDON',
});

/**
 * Keeps the publishing streak alive for 24h after a post goes out. Started with
 * TERMINATE_EXISTING, so every new post restarts the window.
 *
 * The streak is shown in-app only (StreakComponent in the top bar) and sends no
 * email by design: "you lose your streak in two hours" is an artificial
 * deadline on a vanity metric, and every avoidable email spends sender
 * reputation that account activation and password resets depend on.
 */
export async function streakWorkflow({
  organizationId,
}: {
  organizationId: string;
}) {
  await setStreak(organizationId, 'start');
  await sleep(86400000);
  await setStreak(organizationId, 'end');
}
