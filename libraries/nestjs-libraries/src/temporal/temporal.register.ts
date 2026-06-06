import { Global, Injectable, Module, OnModuleInit } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';
import { Connection } from '@temporalio/client';

@Injectable()
export class TemporalRegister implements OnModuleInit {
  constructor(private _client: TemporalService) {}

  async onModuleInit(): Promise<void> {
    if (process.env.TEMPORAL_TLS === 'true') {
      return;
    }

    // Registering Temporal search attributes must never block backend boot.
    // On a fresh deploy the backend can start before Temporal is reachable; a
    // thrown gRPC error here would crash-loop the whole app. Best-effort only.
    try {
      const connection = this._client?.client?.getRawClient()
        ?.connection as Connection;

      if (!connection) {
        console.warn(
          '[Temporal] No client connection at boot; skipping search-attribute registration.'
        );
        return;
      }

      const { customAttributes } =
        await connection.operatorService.listSearchAttributes({
          namespace: process.env.TEMPORAL_NAMESPACE || 'default',
        });

      const neededAttribute = ['organizationId', 'postId'];
      const missingAttributes = neededAttribute.filter(
        (attr) => !customAttributes[attr]
      );

      if (missingAttributes.length > 0) {
        await connection.operatorService.addSearchAttributes({
          namespace: process.env.TEMPORAL_NAMESPACE || 'default',
          searchAttributes: missingAttributes.reduce((all, current) => {
            // @ts-ignore
            all[current] = 1;
            return all;
          }, {}),
        });
      }
    } catch (e) {
      console.warn(
        '[Temporal] Could not register search attributes at boot (Temporal may still be starting). Continuing.',
        e instanceof Error ? e.message : e
      );
    }
  }
}

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [TemporalRegister],
  get exports() {
    return this.providers;
  },
})
export class TemporalRegisterMissingSearchAttributesModule {}
