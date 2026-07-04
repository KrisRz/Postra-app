import { Global, Module } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';

// The CLI app imports DatabaseModule, whose services (posts / autopost /
// integration / notification) inject TemporalService. One-off commands never
// touch Temporal, and wiring the real TemporalModule makes the CLI HANG on
// bootstrap trying to connect to a Temporal server (localhost:7233). Provide a
// global no-op TemporalService so the DI graph resolves without any connection.
// If a command ever actually needs Temporal, wire the real module for it.
@Global()
@Module({
  providers: [
    { provide: TemporalService, useValue: {} as unknown as TemporalService },
  ],
  exports: [TemporalService],
})
export class TemporalStubModule {}
