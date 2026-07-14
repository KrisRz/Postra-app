import { Allow, IsString } from 'class-validator';

export class VideoFunctionDto {
  @IsString()
  identifier: string;

  @IsString()
  functionName: string;

  // Opaque function params — @Allow keeps them past the whitelist.
  @Allow()
  params: any;
}
