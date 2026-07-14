import { IsIn, IsOptional, IsString } from 'class-validator';

export class BillingSubscribeDto {
  @IsIn(['MONTHLY', 'YEARLY'])
  period: 'MONTHLY' | 'YEARLY';

  // TEAM is intentionally NOT purchasable: it's a hidden legacy plan (£39/10
  // channels) that undercuts Business (£79). The UI never offered it; this
  // closes the direct-API purchase hole.
  @IsIn(['STANDARD', 'PRO', 'ULTIMATE'])
  billing: 'STANDARD' | 'PRO' | 'ULTIMATE';

  @IsOptional()
  @IsString()
  utm: string;

  @IsOptional()
  @IsString()
  dub: string;

  @IsOptional()
  @IsString()
  datafast_session_id: string;

  @IsOptional()
  @IsString()
  datafast_visitor_id: string;
}
