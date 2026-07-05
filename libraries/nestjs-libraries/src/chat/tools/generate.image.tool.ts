import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { BrandKitService } from '@gitroom/nestjs-libraries/database/prisma/brand-kit/brand-kit.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { buildBrandImagePrompt } from '@gitroom/nestjs-libraries/openai/brand-prompt';

@Injectable()
export class GenerateImageTool implements AgentToolInterface {
  constructor(
    private _mediaService: MediaService,
    private _brandKitService: BrandKitService
  ) {}
  name = 'generateImageTool';

  run() {
    return createTool({
      id: 'generateImageTool',
      description: `Generate image to use in a post,
                    in case the user specified a platform that requires attachment and attachment was not provided,
                    ask if they want to generate a picture of a video.
      `,
      mcp: {
        annotations: {
          title: 'Generate Image',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        prompt: z.string(),
      }),
      outputSchema: z.object({
        id: z.string(),
        path: z.string(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const org = JSON.parse((context?.requestContext as any)?.get('organization') as string);

        // Reflect the org's Brand Kit in generated visuals so the agent's
        // images come out on-brand, not just whatever the model picks.
        const brandKit = await this._brandKitService.getNormalized(org.id);
        const brandStyle = buildBrandImagePrompt(brandKit);
        const prompt = brandStyle
          ? `${inputData.prompt}. ${brandStyle}`
          : inputData.prompt;

        // generateImage already uploads the image and returns its CDN URL, so
        // just persist that. (It used to re-wrap the returned URL as a base64
        // data URL and re-upload it — decoding a URL as base64 yielded garbage
        // bytes and an "Unsupported file type" error.)
        const url = await this._mediaService.generateImage(prompt, org);
        if (!url) {
          throw new Error('Image generation returned no image.');
        }

        return this._mediaService.saveFile(org.id, url.split('/').pop(), url);
      },
    });
  }
}
