import { Injectable } from '@nestjs/common';
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { Memory } from '@mastra/memory';
import { pStore } from '@gitroom/nestjs-libraries/chat/mastra.store';
import { array, object, string } from 'zod';
import { ModuleRef } from '@nestjs/core';
import { toolList } from '@gitroom/nestjs-libraries/chat/tools/tool.list';
import dayjs from 'dayjs';

export const AgentState = object({
  proverbs: array(string()).default([]),
});

const renderArray = (list: string[], show: boolean) => {
  if (!show) return '';
  return list.map((p) => `- ${p}`).join('\n');
};

// The org's Brand Kit is injected into requestContext by the /copilot/agent
// controller. Turn it into a prompt section so the agent writes in the user's
// voice and reflects their brand when generating images/designs.
const renderBrandKit = (raw?: string) => {
  if (!raw) return '';
  try {
    const bk = JSON.parse(raw);
    if (!bk) return '';
    return `
      Brand guidelines (apply these to everything you write and generate):
        - Tone of voice: ${bk.tone || 'not specified'}
        - Brand colors: primary ${bk.colors?.primary || '-'}, secondary ${
      bk.colors?.secondary || '-'
    }, text ${bk.colors?.text || '-'}
        - Brand font: ${bk.font || 'not specified'}
      Always write post copy in this tone of voice, and reflect these brand colors/style when you generate images or designs.
`;
  } catch {
    return '';
  }
};

@Injectable()
export class LoadToolsService {
  constructor(private _moduleRef: ModuleRef) {}

  async loadTools() {
    return (
      await Promise.all<{ name: string; tool: any }>(
        toolList
          .map((p) => this._moduleRef.get(p, { strict: false }))
          .map(async (p) => ({
            name: p.name as string,
            tool: await p.run(),
          }))
      )
    ).reduce(
      (all, current) => ({
        ...all,
        [current.name]: current.tool,
      }),
      {} as Record<string, any>
    );
  }

  async agent() {
    const tools = await this.loadTools();
    return new Agent({
      id: 'postra',
      name: 'postra',
      description: 'Agent that helps manage and schedule social media posts for users',
      instructions: ({ requestContext }) => {
        const ui: string = requestContext.get('ui' as never);
        const brandKit = renderBrandKit(
          requestContext.get('brandKit' as never) as string
        );
        return `
      Global information:
        - Date (UTC): ${dayjs().format('YYYY-MM-DD HH:mm:ss')}
${brandKit}
      You are an agent that helps manage and schedule social media posts for users, you can:
        - Schedule posts into the future, or now, adding texts, images and videos
        - Generate pictures for posts
        - Generate videos for posts
        - Generate text for posts
        - View and manage the user's content calendar: list their existing scheduled/queued/draft/published posts (listScheduledPosts), reschedule a post to a new date (reschedulePost — uses the post id), and delete/cancel a post (deletePost — uses the group id)
        - Show real analytics for a channel — followers, engagement, reach and more (getAnalytics)
        - List integrations (channels)
      
      - We schedule posts to different integration like facebook, instagram, etc. but to the user we don't say integrations we say channels as integration is the technical name
      - When scheduling a post, you must follow the social media rules and best practices.
      - When scheduling a post, you can pass an array for list of posts for a social media platform, But it has different behavior depending on the platform.
        - For platforms like Threads, Bluesky and X (Twitter), each post in the array will be a separate post in the thread.
        - For platforms like LinkedIn and Facebook, second part of the array will be added as "comments" to the first post.
        - If the social media platform has the concept of "threads", we need to ask the user if they want to create a thread or one long post.
        - For X, if you don't have Premium, don't suggest a long post because it won't work.
        - Platform format will also be passed can be "normal", "markdown", "html", make sure you use the correct format for each platform.
      
      - Sometimes 'integrationSchema' will return rules, make sure you follow them (these rules are set in stone, even if the user asks to ignore them)
      - Each socials media platform has different settings and rules, you can get them by using the integrationSchema tool.
      - Always make sure you use this tool before you schedule any post.
      - In every message I will send you the list of needed social medias (id and platform), if you already have the information use it, if not, use the integrationSchema tool to get it.
      - Make sure you always take the last information I give you about the socials, it might have changed.
      - Before scheduling a post, always make sure you ask the user confirmation by providing all the details of the post (text, images, videos, date, time, social media platform, account).
      - To see, reschedule or delete EXISTING posts, first call listScheduledPosts to fetch them (it returns each post's "id" and "group"). Reschedule with reschedulePost (pass the "id"); delete with deletePost (pass the "group"). Deleting cannot be undone, so always confirm with the user before deleting.
      - For any analytics question (followers, engagement, reach, growth), call getAnalytics with the channel id from integrationList — never invent or guess numbers.
      - Between tools, we will reference things like: [output:name] and [input:name] to set the information right.
      - When outputting a date for the user, make sure it's human readable with time
      - The content of the post, HTML, Each line must be wrapped in <p> here is the possible tags: h1, h2, h3, u, strong, li, ul, p (you can\'t have u and strong together), don't use a "code" box
      ${renderArray(
        [
          'If the user confirm, ask if they would like to get a modal with populated content without scheduling the post yet or if they want to schedule it right away.',
        ],
        !!ui
      )}
`;
      },
      model: openai('gpt-5.2'),
      tools,
      memory: new Memory({
        storage: pStore,
        options: {
          generateTitle: true,
          workingMemory: {
            enabled: true,
            schema: AgentState,
          },
        },
      }),
    });
  }
}
