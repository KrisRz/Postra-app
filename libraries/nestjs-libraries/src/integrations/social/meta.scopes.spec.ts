import { FacebookProvider } from './facebook.provider';
import { InstagramProvider } from './instagram.provider';
import { ThreadsProvider } from './threads.provider';

// Pins what Meta connect REQUIRES to the set with Advanced Access on the
// Postra app (App Review approved 2026-07-15). Meta grants non-role users ONLY
// Advanced-access scopes, so one extra required entry silently breaks channel
// connect for every external user while still working for the team (app roles
// also get Standard access). An upstream Postiz sync is the usual way that
// extra entry sneaks back in. If this fails, either the scope gained Advanced
// Access in the Meta dashboard (then update the test deliberately) or the
// provider must not require it.
const requiredScopesOf = (provider: {
  scopes: string[];
  optionalScopes?: string[];
}) => provider.scopes.filter((s) => !provider.optionalScopes?.includes(s));

describe('Meta provider scopes', () => {
  it('facebook requires only Advanced-access scopes', () => {
    expect(requiredScopesOf(new FacebookProvider()).sort()).toEqual(
      [
        'business_management',
        'pages_manage_posts',
        'pages_read_engagement',
        'pages_show_list',
        'read_insights',
      ].sort()
    );
  });

  it('facebook asks for the first-comment scope without requiring it', () => {
    // Asking is free: accounts with a role in the app get pages_manage_engagement
    // and their first comment works. Requiring it is what broke connect (#188).
    const facebook = new FacebookProvider();

    expect(facebook.scopes).toContain('pages_manage_engagement');
    expect(facebook.optionalScopes).toContain('pages_manage_engagement');
    expect(facebook.commentScope).toBe('pages_manage_engagement');
  });

  it('instagram requires only Advanced-access scopes', () => {
    expect(requiredScopesOf(new InstagramProvider()).sort()).toEqual(
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

  it('threads requests exactly the scopes staged for its app review', () => {
    // The separate "Postra Threads" Meta app is being submitted for review
    // with these four permissions. ThreadsProvider skips checkScopes, so a
    // mismatch surfaces as Meta rejecting the OAuth dialog (invalid scope) —
    // keep this list in lockstep with what the review approves.
    expect(new ThreadsProvider().scopes.sort()).toEqual(
      [
        'threads_basic',
        'threads_content_publish',
        'threads_manage_insights',
        'threads_manage_replies',
      ].sort()
    );
  });

  it('keeps instagram first comment off entirely', () => {
    // Meta retired instagram_manage_comments from the app's permission list
    // after the 07-15 review, so no token can ever hold it — there is nothing
    // to ask for and nothing to gate on. Unlike Facebook, this one stays a
    // flat "off" until Meta offers a replacement we can get through review.
    const instagram = new InstagramProvider();

    expect(instagram.commentsDisabled).toBe(true);
    expect(instagram.scopes).not.toContain('instagram_manage_comments');
  });
});
