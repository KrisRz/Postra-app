import { Allow, IsDefined, IsString } from 'class-validator';

export class IntegrationFunctionDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  id: string;

  // Opaque provider-function payload — @Allow keeps it past the whitelist.
  @Allow()
  data: any;
}
