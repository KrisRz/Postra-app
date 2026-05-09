import {
  IsHexColor,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateBrandKitDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(\/|https?:\/\/)/, {
    message: 'logoPath must be a relative path or absolute URL',
  })
  logoPath?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  font?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  tone?: string;
}
