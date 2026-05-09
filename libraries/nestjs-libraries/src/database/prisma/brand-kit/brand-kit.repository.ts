import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { BrandKit } from '@prisma/client';

export interface BrandKitInput {
  logoPath?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  font?: string;
  tone?: string;
}

@Injectable()
export class BrandKitRepository {
  constructor(private _brandKit: PrismaRepository<'brandKit'>) {}

  getByOrgId(orgId: string): Promise<BrandKit | null> {
    return this._brandKit.model.brandKit.findUnique({
      where: { organizationId: orgId },
    });
  }

  upsert(orgId: string, data: BrandKitInput): Promise<BrandKit> {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    return this._brandKit.model.brandKit.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...cleanData },
      update: cleanData,
    });
  }
}
