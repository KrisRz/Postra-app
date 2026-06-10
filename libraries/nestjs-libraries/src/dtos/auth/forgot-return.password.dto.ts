import {
  IsDefined,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

export class ForgotReturnPasswordDto {
  // Same policy as registration (CreateOrgUserDto) — reset used to accept
  // 3-char passwords, undercutting the register-time minimum.
  @IsString()
  @IsDefined()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @IsString()
  @IsDefined()
  @IsIn([makeId(10)], {
    message: 'Passwords do not match',
  })
  @ValidateIf((o) => o.password !== o.repeatPassword)
  repeatPassword: string;

  @IsString()
  @IsDefined()
  @MinLength(5)
  token: string;
}
