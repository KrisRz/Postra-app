import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { ApiTags } from '@nestjs/swagger';
import handleR2Upload from '@gitroom/nestjs-libraries/upload/r2.uploader';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomFileValidationPipe } from '@gitroom/nestjs-libraries/upload/custom.upload.validation';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';
import { VideoFunctionDto } from '@gitroom/nestjs-libraries/dtos/videos/video.function.dto';
import { GeneratePostDesignDto } from '@gitroom/nestjs-libraries/dtos/media/generate.post.design.dto';
import { GeneratePostCarouselDto } from '@gitroom/nestjs-libraries/dtos/media/generate.post.carousel.dto';
import {
  BrandVoiceCheckDto,
  DecomposeImageDto,
  GenerateVariantsDto,
  RefineDesignDto,
  TemplateSearchDto,
} from '@gitroom/nestjs-libraries/studio/studio.dto';
import { StudioSpec } from '@gitroom/nestjs-libraries/studio/studio-spec';

@ApiTags('Media')
@Controller('/media')
export class MediaController {
  private storage = UploadFactory.createStorage();
  constructor(
    private _mediaService: MediaService,
    private _subscriptionService: SubscriptionService
  ) {}

  @Delete('/:id')
  deleteMedia(@GetOrgFromRequest() org: Organization, @Param('id') id: string) {
    return this._mediaService.deleteMedia(org.id, id);
  }

  @Post('/generate-video')
  generateVideo(
    @GetOrgFromRequest() org: Organization,
    @Body() body: VideoDto
  ) {
    console.log('hello');
    return this._mediaService.generateVideo(org, body);
  }

  @Post('/generate-image')
  async generateImage(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Body('prompt') prompt: string,
    isPicturePrompt = false
  ) {
    const total = await this._subscriptionService.checkCredits(org);
    if (process.env.STRIPE_PUBLISHABLE_KEY && total.credits <= 0) {
      return false;
    }

    return {
      output:
        (isPicturePrompt ? '' : 'data:image/png;base64,') +
        (await this._mediaService.generateImage(prompt, org, isPicturePrompt)),
    };
  }

  @Post('/generate-image-with-prompt')
  async generateImageFromText(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Body('prompt') prompt: string
  ) {
    const image = await this.generateImage(org, req, prompt, true);
    if (!image) {
      return false;
    }

    const file = await this.storage.uploadSimple(image.output);

    return this._mediaService.saveFile(org.id, file.split('/').pop(), file);
  }

  @Post('/generate-post-design')
  generatePostDesign(
    @GetOrgFromRequest() org: Organization,
    @Body() body: GeneratePostDesignDto
  ) {
    return this._mediaService.generatePostDesign(org, body);
  }

  @Post('/generate-carousel-design')
  generateCarouselDesign(
    @GetOrgFromRequest() org: Organization,
    @Body() body: GeneratePostCarouselDto
  ) {
    return this._mediaService.generatePostCarousel(org, body);
  }

  @Put('/:id/canvas')
  saveCanvasJson(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { canvasJson: string }
  ) {
    return this._mediaService.saveCanvasJson(org.id, id, body.canvasJson);
  }

  @Get('/:id')
  getMediaForEdit(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._mediaService.getMediaForEdit(org.id, id);
  }

  @Post('/refine-design')
  refineDesign(
    @GetOrgFromRequest() org: Organization,
    @Body() body: RefineDesignDto
  ) {
    return this._mediaService.refineDesign(org, body);
  }

  @Post('/generate-variants')
  generateVariants(
    @GetOrgFromRequest() org: Organization,
    @Body() body: GenerateVariantsDto
  ) {
    return this._mediaService.generateVariants(org, body);
  }

  @Post('/brand-voice-check')
  brandVoiceCheck(
    @GetOrgFromRequest() org: Organization,
    @Body() body: BrandVoiceCheckDto
  ) {
    return this._mediaService.checkBrandVoice(org, body);
  }

  @Post('/decompose-image')
  decomposeImage(
    @GetOrgFromRequest() org: Organization,
    @Body() body: DecomposeImageDto
  ) {
    return this._mediaService.decomposeImage(org, body);
  }

  @Post('/search-templates')
  searchTemplates(@Body() body: TemplateSearchDto) {
    return this._mediaService.searchTemplates(body);
  }

  @Post('/:id/design-spec')
  saveDesignSpec(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: { spec: StudioSpec }
  ) {
    return this._mediaService.saveDesignSpec(org.id, id, body.spec);
  }

  @Post('/upload-server')
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new CustomFileValidationPipe())
  async uploadServer(
    @GetOrgFromRequest() org: Organization,
    @UploadedFile() file: Express.Multer.File
  ) {
    const originalName = file?.originalname || '';
    const uploadedFile = await this.storage.uploadFile(file);
    return this._mediaService.saveFile(
      org.id,
      uploadedFile.originalname,
      uploadedFile.path,
      originalName
    );
  }

  @Post('/save-media')
  async saveMedia(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Body('name') name: string,
    @Body('originalName') originalName: string
  ) {
    if (!name) {
      return false;
    }
    return this._mediaService.saveFile(
      org.id,
      name,
      process.env.CLOUDFLARE_BUCKET_URL + '/' + name,
      originalName || undefined
    );
  }

  @Post('/information')
  saveMediaInformation(
    @GetOrgFromRequest() org: Organization,
    @Body() body: SaveMediaInformationDto
  ) {
    return this._mediaService.saveMediaInformation(org.id, body);
  }

  @Post('/upload-simple')
  @UseInterceptors(FileInterceptor('file'))
  @UsePipes(new CustomFileValidationPipe())
  async uploadSimple(
    @GetOrgFromRequest() org: Organization,
    @UploadedFile('file') file: Express.Multer.File,
    @Body('preventSave') preventSave: string = 'false'
  ) {
    const originalName = file.originalname;
    const getFile = await this.storage.uploadFile(file);

    if (preventSave === 'true') {
      const { path } = getFile;
      return { path };
    }

    return this._mediaService.saveFile(
      org.id,
      getFile.originalname,
      getFile.path,
      originalName
    );
  }

  @Post('/:endpoint')
  async uploadFile(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Res() res: Response,
    @Param('endpoint') endpoint: string
  ) {
    const upload = await handleR2Upload(endpoint, req, res);
    if (endpoint !== 'complete-multipart-upload') {
      return upload;
    }

    // @ts-ignore
    const name = upload.Location.split('/').pop();
    const originalName = req.body?.file?.name;

    const saveFile = await this._mediaService.saveFile(
      org.id,
      name,
      // @ts-ignore
      upload.Location,
      originalName || undefined
    );

    res.status(200).json({ ...upload, saved: saveFile });
  }

  @Get('/')
  getMedia(
    @GetOrgFromRequest() org: Organization,
    @Query('page') page: number,
    @Query('search') search?: string
  ) {
    return this._mediaService.getMedia(org.id, page, search);
  }

  @Get('/video-options')
  getVideos() {
    return this._mediaService.getVideoOptions();
  }

  @Post('/video/function')
  videoFunction(
    @Body() body: VideoFunctionDto
  ) {
    return this._mediaService.videoFunction(body.identifier, body.functionName, body.params);
  }

  @Get('/generate-video/:type/allowed')
  generateVideoAllowed(
    @GetOrgFromRequest() org: Organization,
    @Param('type') type: string
  ) {
    return this._mediaService.generateVideoAllowed(org, type);
  }
}
