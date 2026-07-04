import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const PLATFORMS = [
  'instagram-feed',
  'instagram-square',
  'instagram-story',
  'facebook',
  'linkedin',
  'tiktok',
  'x',
  'custom',
] as const;

export class RefineDesignDto {
  @IsObject()
  @IsDefined()
  spec: unknown;

  @IsString()
  @IsDefined()
  @MinLength(2)
  @MaxLength(500)
  instruction: string;

  @IsString()
  @IsOptional()
  @MaxLength(2_000_000)
  screenshot?: string;
}

export class GenerateVariantsDto {
  @IsString()
  @IsDefined()
  @MinLength(3)
  @MaxLength(500)
  prompt: string;

  @IsString()
  @IsDefined()
  @IsIn(PLATFORMS as unknown as string[])
  platform: string;
}

export class BrandVoiceCheckDto {
  @IsString()
  @IsDefined()
  @MinLength(3)
  @MaxLength(3000)
  caption: string;
}

const AI_EDIT_ACTIONS = [
  'improve',
  'shorten',
  'expand',
  'adapt',
  'fix_tone',
] as const;

export class AiEditTextDto {
  @IsString()
  @IsDefined()
  @MinLength(3)
  @MaxLength(3000)
  text: string;

  @IsString()
  @IsDefined()
  @IsIn(AI_EDIT_ACTIONS as unknown as string[])
  action: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  platform?: string;
}

export class DecomposeImageDto {
  @IsString()
  @IsDefined()
  // Magic Layers (frontend) allows up to 4 MB images; base64 inflates ~4/3,
  // so a 4 MB image is ~5.6M chars. The old 2M cap rejected anything over
  // ~1.5 MB with a 400. 8M covers the 4 MB frontend cap (body limit is 50mb).
  @MaxLength(8_000_000)
  imageDataUrl: string;

  @IsString()
  @IsDefined()
  @IsIn(PLATFORMS as unknown as string[])
  platform: string;
}

export class TemplateSearchEntryDto {
  @IsString()
  id: string;

  @IsString()
  @MaxLength(500)
  text: string;
}

export class TemplateSearchDto {
  @IsString()
  @IsDefined()
  @MinLength(2)
  @MaxLength(200)
  query: string;

  @IsArray()
  @ArrayMaxSize(200)
  templates: TemplateSearchEntryDto[];
}
