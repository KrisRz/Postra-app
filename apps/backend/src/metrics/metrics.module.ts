import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

// Registers the global RED interceptor. The /metrics endpoint itself is served
// by a standalone server on a dedicated internal port (startMetricsServer in
// main.ts) to bypass the app's global throttle/auth guards — see ./metrics.ts.
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class MetricsModule {}
