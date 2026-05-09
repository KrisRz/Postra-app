import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { BrandKitService } from '@gitroom/nestjs-libraries/database/prisma/brand-kit/brand-kit.service';
import { UpdateBrandKitDto } from '@gitroom/nestjs-libraries/dtos/brand-kit/brand-kit.dto';

@ApiTags('Brand Kit')
@Controller('/brand-kit')
export class BrandKitController {
  constructor(private _brandKitService: BrandKitService) {}

  @Get('/')
  get(@GetOrgFromRequest() org: Organization) {
    return this._brandKitService.get(org.id);
  }

  @Put('/')
  upsert(
    @GetOrgFromRequest() org: Organization,
    @Body() body: UpdateBrandKitDto
  ) {
    return this._brandKitService.upsert(org.id, body);
  }
}
