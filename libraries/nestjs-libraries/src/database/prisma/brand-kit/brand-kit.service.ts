import { Injectable } from '@nestjs/common';
import {
  BrandKitRepository,
  BrandKitInput,
} from '@gitroom/nestjs-libraries/database/prisma/brand-kit/brand-kit.repository';
import { BrandKit } from '@prisma/client';

export interface NormalizedBrandKit {
  colors: { primary: string; secondary: string; text: string };
  font: string;
  tone: string;
  logoPath: string | null;
}

@Injectable()
export class BrandKitService {
  constructor(private _brandKitRepository: BrandKitRepository) {}

  get(orgId: string) {
    return this._brandKitRepository.getByOrgId(orgId);
  }

  upsert(orgId: string, data: BrandKitInput) {
    return this._brandKitRepository.upsert(orgId, data);
  }

  /**
   * Loaded by AI generation pipeline — converts Prisma row to the shape
   * `OpenaiService.generatePostDesign` expects, or returns null if no kit set.
   */
  async getNormalized(orgId: string): Promise<NormalizedBrandKit | null> {
    const kit = await this._brandKitRepository.getByOrgId(orgId);
    if (!kit) return null;
    return BrandKitService.toNormalized(kit);
  }

  static toNormalized(kit: BrandKit): NormalizedBrandKit {
    return {
      colors: {
        primary: kit.primaryColor,
        secondary: kit.secondaryColor,
        text: kit.textColor,
      },
      font: kit.font,
      tone: kit.tone,
      logoPath: kit.logoPath,
    };
  }
}
