import { channelLimitFor, pricing, TRIAL_CHANNEL_CAP } from './pricing';

describe('channelLimitFor', () => {
  it('caps a trialing org at TRIAL_CHANNEL_CAP regardless of tier', () => {
    expect(
      channelLimitFor({ isTrailing: true, subscription: { totalChannels: 10 } })
    ).toBe(TRIAL_CHANNEL_CAP);
    expect(
      channelLimitFor({ isTrailing: true, subscription: { totalChannels: 6 } })
    ).toBe(TRIAL_CHANNEL_CAP);
  });

  it('does not raise a trialing org above its own tier', () => {
    expect(
      channelLimitFor({ isTrailing: true, subscription: { totalChannels: 3 } })
    ).toBe(3);
    // trialing before checkout: no subscription yet, FREE limit applies
    expect(channelLimitFor({ isTrailing: true, subscription: null })).toBe(
      pricing.FREE.channel
    );
  });

  it('gives converted (non-trialing) orgs their full quota', () => {
    expect(
      channelLimitFor({ isTrailing: false, subscription: { totalChannels: 10 } })
    ).toBe(10);
  });

  it('falls back to the FREE limit without a subscription', () => {
    expect(channelLimitFor({ isTrailing: false, subscription: null })).toBe(
      pricing.FREE.channel
    );
    expect(channelLimitFor(undefined)).toBe(pricing.FREE.channel);
  });
});
