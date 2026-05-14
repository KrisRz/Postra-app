import { Global, Module } from '@nestjs/common';
import { ImagesSlides } from '@gitroom/nestjs-libraries/videos/images-slides/images.slides';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { Veo3 } from '@gitroom/nestjs-libraries/videos/veo3/veo3';
import { CaptionsService } from '@gitroom/nestjs-libraries/videos/captions/captions.service';

@Global()
@Module({
  providers: [ImagesSlides, Veo3, VideoManager, CaptionsService],
  get exports() {
    return this.providers;
  },
})
export class VideoModule {}
