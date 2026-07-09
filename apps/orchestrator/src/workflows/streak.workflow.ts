import { proxyActivities, sleep } from '@temporalio/workflow';
import { EmailActivity } from '@gitroom/orchestrator/activities/email.activity';

const { sendEmailAsync, getUserOrgs, setStreak } = proxyActivities<EmailActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  cancellationType: 'ABANDON',
});

export async function streakWorkflow({
  organizationId,
}: {
  organizationId: string;
}) {
  await setStreak(organizationId, 'start');
  await sleep(79200000);
  const userOrgs = await getUserOrgs(organizationId);
  // getUserOrgs uses findUnique — an org deleted during the ~22h sleep returns
  // null, and userOrgs.users would throw in workflow code → Temporal retries the
  // task forever (orphaned failing workflow). Same guard as digest.email.workflow.
  for (const user of userOrgs?.users || []) {
    if (!user.user.sendStreakEmails) {
      continue;
    }
    await sendEmailAsync(
      user.user.email,
      'Streak Reminder',
      '<p>You are about to lose your streak in two hours! schedule a post now to keep it!</p>',
      'bottom'
    );
  }
  await sleep(7200000);
  await setStreak(organizationId, 'end');
}
