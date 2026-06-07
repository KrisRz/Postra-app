import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { httpRequestDuration } from './metrics';

// RED instrumentation (Rate / Errors / Duration). Records on response `finish`
// so the status code is the final one — i.e. after exception filters have run
// (an interceptor's tap() fires before the filter sets the error status).
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const stopTimer = httpRequestDuration.startTimer();

    res.once('finish', () => {
      // Matched route pattern (e.g. /posts/:id), never the raw URL — raw URLs
      // carry ids and would explode label cardinality. Unmatched requests
      // (404s) collapse to a single 'unknown' series.
      const route = req.route?.path ?? 'unknown';
      stopTimer({
        method: req.method,
        route,
        status_code: res.statusCode,
      });
    });

    return next.handle();
  }
}
