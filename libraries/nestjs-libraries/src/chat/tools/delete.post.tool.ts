import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import z from 'zod';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class DeletePostTool implements AgentToolInterface {
  constructor(private _postsService: PostsService) {}
  name = 'deletePost';

  run() {
    return createTool({
      id: 'deletePost',
      description: `Permanently delete/cancel an existing post and any pending publish for it. Pass the post "group" id (from listScheduledPosts, NOT the id). This cannot be undone — ALWAYS confirm with the user before calling.`,
      inputSchema: z.object({
        group: z
          .string()
          .describe('The post group id from listScheduledPosts.'),
      }),
      mcp: {
        annotations: {
          title: 'Delete post',
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      outputSchema: z.object({
        group: z.string(),
        deleted: z.boolean(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const organizationId = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        ).id;

        const { group } = inputData as { group: string };
        const result = await this._postsService.deletePost(
          organizationId,
          group
        );

        return { group, deleted: !!result };
      },
    });
  }
}
