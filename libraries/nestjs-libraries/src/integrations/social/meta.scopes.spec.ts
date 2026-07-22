import { FacebookProvider } from './facebook.provider';
import { InstagramProvider } from './instagram.provider';

// Pins the Meta OAuth scopes to the set with Advanced Access on the Postra
// app (App Review approved 2026-07-15). Meta grants non-role users ONLY
// Advanced-access scopes, and checkScopes() requires every listed scope, so
// one extra entry here silently breaks channel connect for every external
// user while still working for the team (app roles also get Standard access).
// An upstream Postiz sync is the usual way that extra entry sneaks back in.
// If this fails, either the scope gained Advanced Access in the Meta
// dashboard (then update the test deliberately) or the provider must not
// request it.
describe('Meta provider scopes', () => {
  it('facebook requests only Advanced-access scopes', () => {
    expect(new FacebookProvider().scopes.sort()).toEqual(
      [
        'business_management',
        'pages_manage_posts',
        'pages_read_engagement',
        'pages_show_list',
        'read_insights',
      ].sort()
    );
  });

  it('instagram requests only Advanced-access scopes', () => {
    expect(new InstagramProvider().scopes.sort()).toEqual(
      [
        'business_management',
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_insights',
        'pages_read_engagement',
        'pages_show_list',
      ].sort()
    );
  });

  it('keeps first comment off while its scopes lack Advanced Access', () => {
    // pages_manage_engagement (FB) is Standard until its mini App Review;
    // instagram_manage_comments was retired by Meta entirely. Publishing a
    // comment without them fails at Meta, so the workflows must skip it.
    expect(new FacebookProvider().commentsDisabled).toBe(true);
    expect(new InstagramProvider().commentsDisabled).toBe(true);
  });
});
