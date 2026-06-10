import { log, proxyActivities, sleep } from '@temporalio/workflow';
import { AutopostActivity } from '@gitroom/orchestrator/activities/autopost.activity';

const { autoPost } = proxyActivities<AutopostActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '2 minutes',
  },
});

export async function autoPostWorkflow({
  id,
  immediately,
}: {
  id: string;
  immediately: boolean;
}) {
  while (true) {
    try {
      if (immediately) {
        await autoPost(id);
      }
    } catch (err) {
      // Swallowing keeps the hourly loop alive, but a feed that fails every
      // run would otherwise go dark with no trace.
      log.error('autoPost run failed', { autopostId: id, error: String(err) });
    }
    immediately = true;
    await sleep(3600000);
  }
}
