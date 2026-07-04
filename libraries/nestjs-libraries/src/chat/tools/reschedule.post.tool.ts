import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import z from 'zod';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class ReschedulePostTool implements AgentToolInterface {
  constructor(private _postsService: PostsService) {}
  name = 'reschedulePost';

  run() {
    return createTool({
      id: 'reschedulePost',
      description: `Move an existing post to a new date/time. Pass the post "id" (from listScheduledPosts, NOT the group) and the new UTC date. Always confirm the new date with the user first.`,
      inputSchema: z.object({
        id: z.string().describe('The post id from listScheduledPosts.'),
        date: z
          .string()
          .describe('New publish date-time in UTC (ISO 8601).'),
      }),
      mcp: {
        annotations: {
          title: 'Reschedule post',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      outputSchema: z.object({
        id: z.string(),
        date: z.string(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const { id, date } = inputData as { id: string; date: string };
        await this._postsService.changeDate(organizationId, id, date, 'schedule');

        return { id, date };
      },
    });
  }
}
