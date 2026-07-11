import { Injectable } from '@nestjs/common';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { SubscriptionRepository } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.repository';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { Organization } from '@prisma/client';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { AuditService } from '@gitroom/nestjs-libraries/database/prisma/audit/audit.service';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly _subscriptionRepository: SubscriptionRepository,
    private readonly _integrationService: IntegrationService,
    private readonly _organizationService: OrganizationService,
    private readonly _auditService: AuditService
  ) {}

  getSubscriptionByOrganizationId(organizationId: string) {
    return this._subscriptionRepository.getSubscriptionByOrganizationId(
      organizationId
    );
  }

  // For background flows (autopost, generate-posts) that only hold an orgId:
  // loads the subscription so credit enforcement sees the real tier.
  async useCreditByOrgId<T>(
    orgId: string,
    type: string,
    func: () => Promise<T>
  ): Promise<T> {
    const subscription =
      await this._subscriptionRepository.getSubscriptionByOrgId(orgId);
    return this.useCredit({ id: orgId, subscription } as any, type, func);
  }

  useCredit<T>(
    organization: Organization,
    type = 'ai_images',
    func: () => Promise<T>
  ): Promise<T> {
    return this._subscriptionRepository.useCredit(
      organization,
      type,
      func,
      this.getCreditEnforcement(organization, type)
    );
  }

  // Atomic counterpart of checkCredits (which stays advisory/UI-only): when
  // billing is on, useCredit re-verifies the cap inside the insert
  // transaction so parallel requests can't overshoot the plan limit.
  private getCreditEnforcement(
    organization: Organization,
    checkType: string
  ): { limit: number; cycleStart: Date } | undefined {
    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
      return undefined;
    }
    // @ts-ignore
    const tier = organization?.subscription?.subscriptionTier || 'FREE';
    if (tier === 'FREE') {
      return { limit: 0, cycleStart: new Date(0) };
    }
    // @ts-ignore
    let date = dayjs(organization.subscription.createdAt);
    while (date.isBefore(dayjs())) {
      date = date.add(1, 'month');
    }
    const cycleStart = date.subtract(1, 'month');
    const limit =
      checkType === 'ai_images'
        ? pricing[tier as keyof typeof pricing].image_generation_count
        : pricing[tier as keyof typeof pricing].generate_videos;
    return { limit: limit || 0, cycleStart: cycleStart.toDate() };
  }

  getCode(code: string) {
    return this._subscriptionRepository.getCode(code);
  }

  async deleteSubscription(customerId: string) {
    // modifySubscription returns false for lifetime/grandfathered grants (and
    // unknown customers). A stray customer.subscription.deleted webhook or the
    // superadmin cancel path must NOT then hard-delete the lifetime row and drop
    // the org to FREE — bail if the downgrade was refused.
    const modified = await this.modifySubscription(
      customerId,
      pricing.FREE.channel || 0,
      'FREE'
    );
    if (!modified) {
      return false;
    }
    this._auditService.record({
      action: 'subscription.delete',
      metadata: { customerId },
    });
    return this._subscriptionRepository.deleteSubscriptionByCustomerId(
      customerId
    );
  }

  updateCustomerId(organizationId: string, customerId: string) {
    return this._subscriptionRepository.updateCustomerId(
      organizationId,
      customerId
    );
  }

  async checkSubscription(organizationId: string, subscriptionId: string) {
    return await this._subscriptionRepository.checkSubscription(
      organizationId,
      subscriptionId
    );
  }

  async modifySubscriptionByOrg(
    organizationId: string,
    totalChannels: number,
    billing: 'FREE' | 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE'
  ) {
    if (!organizationId) {
      return false;
    }

    const getCurrentSubscription =
      (await this._subscriptionRepository.getSubscriptionByOrgId(
        organizationId
      ))!;

    const to = pricing[billing];

    const currentTotalChannels = (
      await this._integrationService.getIntegrationsList(organizationId)
    ).filter((f) => !f.disabled);

    if (currentTotalChannels.length > totalChannels) {
      await this._integrationService.disableIntegrations(
        organizationId,
        currentTotalChannels.length - totalChannels
      );
    }

    // Reconcile active team seats to the new tier (owner + earliest-joined
    // members up to the cap stay; overflow is disabled on downgrade and
    // re-enabled within the cap on upgrade).
    await this._organizationService.reconcileTeamSeats(
      organizationId,
      to.team_members
    );

    if (billing === 'FREE') {
      await this._integrationService.changeActiveCron(organizationId);
    }

    return true;
  }

  async modifySubscription(
    customerId: string,
    totalChannels: number,
    billing: 'FREE' | 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE'
  ) {
    if (!customerId) {
      return false;
    }

    const getOrgByCustomerId =
      await this._subscriptionRepository.getOrganizationByCustomerId(
        customerId
      );

    const getCurrentSubscription =
      (await this._subscriptionRepository.getSubscriptionByCustomerId(
        customerId
      ))!;

    if (
      !getOrgByCustomerId ||
      (getCurrentSubscription && getCurrentSubscription?.isLifetime)
    ) {
      return false;
    }

    const to = pricing[billing];

    const currentTotalChannels = (
      await this._integrationService.getIntegrationsList(
        getOrgByCustomerId?.id!
      )
    ).filter((f) => !f.disabled);

    // Platform gating: disable any active channel whose platform is not allowed
    // on the new tier (e.g. downgrading Business→Pro drops X / Mastodon /
    // Bluesky / Telegram). Do this before the count cap so the remaining set is
    // the keepers.
    const disallowedByPlatform = currentTotalChannels.filter(
      (c) => !to.allowedProviders.includes(c.providerIdentifier)
    );
    for (const channel of disallowedByPlatform) {
      await this._integrationService.disableChannel(
        getOrgByCustomerId?.id!,
        channel.id
      );
    }

    const remainingChannels = currentTotalChannels.filter((c) =>
      to.allowedProviders.includes(c.providerIdentifier)
    );
    if (remainingChannels.length > totalChannels) {
      await this._integrationService.disableIntegrations(
        getOrgByCustomerId?.id!,
        remainingChannels.length - totalChannels
      );
    }

    // Reconcile active team seats to the new tier (owner + earliest-joined
    // members up to the cap stay; overflow is disabled on downgrade and
    // re-enabled within the cap on upgrade).
    await this._organizationService.reconcileTeamSeats(
      getOrgByCustomerId?.id!,
      to.team_members
    );

    if (billing === 'FREE') {
      await this._integrationService.changeActiveCron(getOrgByCustomerId?.id!);
    }

    return true;
  }

  async createOrUpdateSubscription(
    isTrailing: boolean,
    identifier: string,
    customerId: string,
    totalChannels: number,
    billing: 'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE',
    period: 'MONTHLY' | 'YEARLY',
    cancelAt: number | null,
    code?: string,
    org?: string
  ) {
    if (!code) {
      try {
        const load = await this.modifySubscription(
          customerId,
          totalChannels,
          billing
        );
        if (!load) {
          return {};
        }
      } catch (e) {
        return {};
      }
    }
    this._auditService.record({
      action: 'subscription.change',
      organizationId: org,
      metadata: { customerId, billing, period, totalChannels, isTrailing },
    });
    return this._subscriptionRepository.createOrUpdateSubscription(
      isTrailing,
      identifier,
      customerId,
      totalChannels,
      billing,
      period,
      cancelAt,
      code,
      org ? { id: org } : undefined
    );
  }

  /**
   * One-off pre-launch backfill. Turning on Stripe billing flips every org that
   * has no subscription down to FREE (2 channels) — this would strip access from
   * the founder and existing users. This grants each such org a lifetime top-tier
   * (Business/ULTIMATE) subscription instead. Passing a `code` marks it
   * isLifetime and bypasses Stripe entirely (no customer/charge). Idempotent:
   * orgs that already hold an active subscription are left untouched.
   */
  async grandfatherAllOrganizations(apply: boolean) {
    const TIER = 'ULTIMATE' as const;
    const MIN_CHANNELS = 100; // generous ceiling so a comped account never hits a cap
    const orgs =
      await this._subscriptionRepository.getAllOrganizationsForGrandfather();

    const granted: Array<{ id: string; name: string; channels: number }> = [];
    const skipped: Array<{ id: string; name: string; reason: string }> = [];

    for (const org of orgs) {
      const sub = org.subscription;
      if (sub && !sub.deletedAt) {
        skipped.push({
          id: org.id,
          name: org.name,
          reason: `already ${sub.isLifetime ? 'lifetime' : 'active'} ${
            sub.subscriptionTier
          }`,
        });
        continue;
      }

      const channels = Math.max(MIN_CHANNELS, org.Integration.length);
      granted.push({ id: org.id, name: org.name, channels });

      if (apply) {
        await this.createOrUpdateSubscription(
          false, // isTrailing
          makeId(10), // identifier
          '', // customerId (unused when org id + code are provided)
          channels,
          TIER,
          'MONTHLY',
          null,
          `grandfather-${org.id}`, // code -> isLifetime=true, skips Stripe
          org.id
        );
      }
    }

    return { total: orgs.length, granted, skipped };
  }

  getSubscriptionByIdentifier(identifier: string) {
    return this._subscriptionRepository.getSubscriptionByIdentifier(identifier);
  }

  async getSubscription(organizationId: string) {
    return this._subscriptionRepository.getSubscription(organizationId);
  }

  async checkCredits(organization: Organization, checkType = 'ai_images') {
    // @ts-ignore
    const type = organization?.subscription?.subscriptionTier || 'FREE';

    if (type === 'FREE') {
      return { credits: 0 };
    }

    // @ts-ignore
    let date = dayjs(organization.subscription.createdAt);
    while (date.isBefore(dayjs())) {
      date = date.add(1, 'month');
    }

    const checkFromMonth = date.subtract(1, 'month');
    const imageGenerationCount =
      checkType === 'ai_images'
        ? pricing[type].image_generation_count
        : pricing[type].generate_videos;

    const totalUse = await this._subscriptionRepository.getCreditsFrom(
      organization.id,
      checkFromMonth,
      checkType
    );

    return {
      credits: imageGenerationCount - totalUse,
    };
  }

  async addSubscription(orgId: string, userId: string, subscription: any) {
    await this._subscriptionRepository.setCustomerId(orgId, userId);
    return this.createOrUpdateSubscription(
      false,
      makeId(5),
      userId,
      pricing[subscription].channel!,
      subscription,
      'MONTHLY',
      null,
      undefined,
      orgId
    );
  }
}
