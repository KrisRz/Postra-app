import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { WebhooksDto } from '@gitroom/nestjs-libraries/dtos/webhooks/webhooks.dto';

@Injectable()
export class WebhooksRepository {
  constructor(
    private _webhooks: PrismaRepository<'webhooks'>,
    private _integration: PrismaRepository<'integration'>
  ) {}

  getTotal(orgId: string) {
    return this._webhooks.model.webhooks.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
    });
  }

  getWebhooks(orgId: string) {
    return this._webhooks.model.webhooks.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        integrations: {
          select: {
            integration: {
              select: {
                id: true,
                picture: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  deleteWebhook(orgId: string, id: string) {
    return this._webhooks.model.webhooks.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async createWebhook(orgId: string, body: WebhooksDto) {
    let id: string;
    if (body.id) {
      // Update path (PUT /webhooks): scope to the org and NEVER create.
      // A prior upsert here let a made-up id fall through to `create`,
      // turning the (un-policy-checked) update route into an uncapped
      // create that bypassed the per-plan webhook limit enforced on POST.
      const updated = await this._webhooks.model.webhooks.updateMany({
        where: { id: body.id, organizationId: orgId },
        data: { url: body.url, name: body.name },
      });
      if (updated.count === 0) {
        throw new Error('Webhook not found');
      }
      id = body.id;
    } else {
      const created = await this._webhooks.model.webhooks.create({
        data: {
          organizationId: orgId,
          url: body.url,
          name: body.name,
        },
      });
      id = created.id;
    }

    // Only link integrations the org actually owns — a client-supplied
    // foreign integration id would otherwise leak that channel's name/picture
    // back through getWebhooks.
    const ownedIntegrations = await this._integration.model.integration.findMany(
      {
        where: {
          organizationId: orgId,
          id: { in: (body.integrations || []).map((i) => i.id) },
        },
        select: { id: true },
      }
    );

    await this._webhooks.model.webhooks.update({
      where: {
        id,
        organizationId: orgId,
      },
      data: {
        integrations: {
          deleteMany: {},
          create: ownedIntegrations.map((integration) => ({
            integrationId: integration.id,
          })),
        },
      },
    });

    return { id };
  }
}
