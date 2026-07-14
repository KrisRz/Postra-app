import { Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import {
  AiUsageEvent,
  setAiUsageSink,
} from '@gitroom/nestjs-libraries/services/ai-usage.record';

@Injectable()
export class AiUsageService {
  constructor(private _prisma: PrismaService) {
    // Plug the module-level recorder into Prisma. Fire-and-forget: metering
    // must never slow down or fail an AI call.
    setAiUsageSink((event: AiUsageEvent) => {
      this._prisma.aiUsage
        .create({
          data: {
            organizationId: event.organizationId ?? null,
            engine: event.engine,
            model: event.model,
            unit: event.unit ?? 'tokens',
            inputAmount: Math.max(0, Math.round(event.inputAmount ?? 0)),
            outputAmount: Math.max(0, Math.round(event.outputAmount ?? 0)),
          },
        })
        .catch(() => {});
    });
  }

  summary(from: Date, to: Date) {
    return Promise.all([
      this._prisma.aiUsage.groupBy({
        by: ['engine', 'model', 'unit'],
        where: { createdAt: { gte: from, lte: to } },
        _sum: { inputAmount: true, outputAmount: true },
        _count: { _all: true },
      }),
      this._prisma.aiUsage.groupBy({
        by: ['organizationId'],
        where: { createdAt: { gte: from, lte: to }, unit: 'tokens' },
        _sum: { inputAmount: true, outputAmount: true },
        orderBy: [{ _sum: { outputAmount: 'desc' } }],
        take: 10,
      }),
    ]);
  }
}
