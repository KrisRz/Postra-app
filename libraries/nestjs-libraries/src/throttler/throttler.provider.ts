import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  public override async canActivate(
    context: ExecutionContext
  ): Promise<boolean> {
    const { url, method } = context.switchToHttp().getRequest<Request>();

    // Public posting API (existing behaviour).
    if (method === 'POST' && url.includes('/public/v1/posts')) {
      return super.canActivate(context);
    }

    // Authentication endpoints — enforce throttling to stop brute-force and
    // abuse. login/register/forgot carry their own @Throttle limits; other
    // /auth POSTs fall back to the global default limit. These are
    // unauthenticated, so getTracker buckets them by client IP.
    if (method === 'POST' && url.includes('/auth/')) {
      return super.canActivate(context);
    }

    // Everything else is intentionally not throttled.
    return true;
  }

  protected override async getTracker(
    req: Record<string, any>
  ): Promise<string> {
    // Authenticated routes carry an org context — keep the per-org buckets.
    if (req?.org?.id) {
      return (
        req.org.id + '_' + (req.url.indexOf('/posts') > -1 ? 'posts' : 'other')
      );
    }

    // Unauthenticated routes (auth endpoints): bucket by client IP. The app
    // runs behind a proxy (ALB) without express `trust proxy`, so read the
    // forwarded client IP, falling back to the socket address.
    const forwarded = (req.headers?.['x-forwarded-for'] as string) || '';
    const ip =
      forwarded.split(',')[0].trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    return 'ip_' + ip;
  }
}
