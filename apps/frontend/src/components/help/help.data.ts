// Static content for the in-app Help page. Steps/gotchas/descriptions are
// filled in per channel and per tab as we write them — an empty array/string
// renders as a "coming soon" placeholder, so the page structure can ship first.
export type ChannelConnectType = 'oauth' | 'credentials' | 'bot';

export interface ChannelGuide {
  /** Matches /icons/platforms/<identifier>.png and the backend provider id. */
  identifier: string;
  name: string;
  connectType: ChannelConnectType;
  steps: string[];
  gotchas: string[];
}

export interface AppTabGuide {
  id: string;
  name: string;
  description: string;
}

export interface SettingsSectionGuide {
  name: string;
  availability: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

// Channels with a non-standard connect flow (bot dialog, credentials form)
// come first — they generate the most confusion.
export const CHANNEL_GUIDES: ChannelGuide[] = [
  {
    identifier: 'telegram',
    name: 'Telegram',
    connectType: 'bot',
    steps: [
      "Postra publishes to a Telegram channel or group, not to your personal account. If you don't have one yet, create it inside your existing Telegram app: tap the pencil (new message) icon and choose \"New Channel\" — no new account or phone number needed, and it can be private.",
      'In Postra, click "Add Channel" and pick Telegram — a dialog shows our bot name and a one-time /connect code.',
      'In Telegram, open your channel, tap its name at the top, then Administrators → Add Admin (on desktop: ⋮ → Manage Channel → Administrators). Search for the bot by the name shown in the dialog and add it with the "Post Messages" permission ("Delete Messages" too, so it can clean up the connect code).',
      'Copy the /connect code from the dialog and send it as a post in that channel or group — not in a private chat with the bot.',
      'Go back to Postra — the channel is detected automatically within a few seconds and appears in your channel list.',
      'From now on, Telegram is just another channel in the composer: tick it when creating a post and the bot publishes the post to your channel. Nothing is posted unless you select it.',
    ],
    gotchas: [
      'Bots can only be added to a channel as administrators — if you can\'t add it as a member, that\'s expected; use Administrators → Add Admin.',
      "The bot must have the \"Post Messages\" admin permission — without it the connect code isn't detected and publishing fails.",
      "Send the /connect message in the channel or group you're connecting, not in a private chat with the bot.",
      'Posts are published by the bot, so keep it in the channel — removing it stops publishing.',
      'Telegram posts allow up to 4,096 characters with formatting and images — often more room than other platforms.',
    ],
  },
  {
    identifier: 'bluesky',
    name: 'Bluesky',
    connectType: 'credentials',
    steps: [
      'In Bluesky, open Settings → Privacy and Security → App Passwords and create a new app password.',
      'In Postra, click "Add Channel" and pick Bluesky.',
      'Leave the service URL as https://bsky.social unless you self-host.',
      'Enter your full handle (e.g. yourname.bsky.social) and the app password.',
    ],
    gotchas: [
      'Use an app password, not your main Bluesky password.',
      'Enter the full handle, including .bsky.social (or your custom domain).',
    ],
  },
  {
    identifier: 'mastodon',
    name: 'Mastodon',
    connectType: 'oauth',
    steps: [
      'Click "Add Channel" and pick Mastodon.',
      'Sign in to Mastodon and approve the requested permissions.',
    ],
    gotchas: [
      'Posts are limited to 500 characters (the standard Mastodon limit).',
      "Account on a different instance and can't connect? Email us and we'll help.",
    ],
  },
  {
    identifier: 'facebook',
    name: 'Facebook',
    connectType: 'oauth',
    steps: [
      'Click "Add Channel" and pick Facebook.',
      'Log in with the Facebook account that manages your Page and approve all requested permissions.',
      'Choose the Page you want to publish to.',
    ],
    gotchas: [
      'Publishing works with Facebook Pages, not personal profiles.',
      "Don't untick any permissions during login — missing permissions break publishing later.",
    ],
  },
  {
    identifier: 'instagram',
    name: 'Instagram',
    connectType: 'oauth',
    steps: [
      'Make sure your Instagram account is a Business or Creator account linked to a Facebook Page.',
      'Click "Add Channel", pick Instagram and log in with the Facebook account that manages that Page.',
      'Choose the Instagram account.',
    ],
    gotchas: [
      'Personal Instagram accounts won\'t appear — switch to Business/Creator in the Instagram app (Settings → Account type) and link a Facebook Page first.',
      "Feed images are automatically cropped to Instagram's allowed aspect ratios.",
    ],
  },
  {
    identifier: 'threads',
    name: 'Threads',
    connectType: 'oauth',
    steps: [
      'Click "Add Channel", pick Threads and sign in with your Instagram credentials.',
      'Approve the requested permissions.',
    ],
    gotchas: [
      'Threads connects separately from Instagram — connect both if you post to both.',
    ],
  },
  {
    identifier: 'x',
    name: 'X (Twitter)',
    connectType: 'oauth',
    steps: [
      'Click "Add Channel", pick X and authorize Postra.',
    ],
    gotchas: [
      'X rejects two identical posts in a row — vary the text when reposting.',
    ],
  },
  {
    identifier: 'linkedin',
    name: 'LinkedIn',
    connectType: 'oauth',
    steps: [
      'Click "Add Channel", pick LinkedIn and sign in.',
      'Approve the requested permissions.',
    ],
    gotchas: [
      'This connects your personal profile — for a company page use "LinkedIn Page" instead.',
    ],
  },
  {
    identifier: 'linkedin-page',
    name: 'LinkedIn Page',
    connectType: 'oauth',
    steps: [
      'Click "Add Channel", pick LinkedIn Page and sign in.',
      'Choose the company page you want to publish to.',
    ],
    gotchas: [
      'You need to be an administrator of the company page.',
    ],
  },
  {
    identifier: 'youtube',
    name: 'YouTube',
    connectType: 'oauth',
    steps: [
      'Click "Add Channel", pick YouTube, choose your Google account and approve access.',
    ],
    gotchas: [
      'The Google account needs an existing YouTube channel.',
      'YouTube accepts video posts only.',
    ],
  },
  {
    identifier: 'tiktok',
    name: 'TikTok',
    connectType: 'oauth',
    steps: [
      'Click "Add Channel", pick TikTok, log in and approve access.',
    ],
    gotchas: [
      "TikTok is video-first — publishing can take a moment to process on TikTok's side.",
    ],
  },
];

export const APP_TABS: AppTabGuide[] = [
  {
    id: 'calendar',
    name: 'Calendar',
    description:
      'Your posting hub: every scheduled, draft and published post in calendar or list view. This is also where you add channels and create posts.',
  },
  {
    id: 'agent',
    name: 'Agent',
    description:
      'An AI assistant that knows your channels — chat with it to brainstorm, draft and schedule posts.',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Follower growth and post performance per channel.',
  },
  {
    id: 'studio',
    name: 'Studio',
    description:
      'Design graphics and short videos for your posts — templates, your Brand Kit and AI image generation.',
  },
  {
    id: 'autopost',
    name: 'Auto Post',
    description:
      'Connect an RSS feed (e.g. your blog) and new articles are turned into social posts automatically.',
  },
  {
    id: 'media',
    name: 'Media',
    description:
      "Every image and video you've uploaded, ready to reuse in any post.",
  },
  {
    id: 'plugs',
    name: 'Plugs',
    description:
      'Small per-channel automations that run in the background to boost reach — available for selected channels such as X, LinkedIn and Threads.',
  },
  {
    id: 'billing',
    name: 'Billing',
    description: 'Your subscription: plan, payment method and invoices.',
  },
  {
    id: 'settings',
    name: 'Settings',
    description:
      'Workspace configuration — see "Settings explained" below for each section.',
  },
];

export const SETTINGS_SECTIONS: SettingsSectionGuide[] = [
  {
    name: 'Global Settings',
    availability: 'All plans',
    description:
      'Interface language, email notifications, link shortening and account deletion.',
  },
  {
    name: 'Teams',
    availability: 'Plans with team seats',
    description:
      'Invite teammates to your workspace so you can manage channels and posts together.',
  },
  {
    name: 'Webhooks',
    availability: 'Plans with webhooks',
    description:
      'Get an HTTP call to your own endpoint whenever posts publish — for connecting Postra to your own tools.',
  },
  {
    name: 'Auto Post',
    availability: 'Plans with Auto Post',
    description: 'Manage the RSS feeds used by the Auto Post tab.',
  },
  {
    name: 'Sets',
    availability: 'Paid plans',
    description:
      'Save a group of channels as a set and select all of them with one click when composing.',
  },
  {
    name: 'Signatures',
    availability: 'Paid plans',
    description:
      'Reusable text snippets (e.g. hashtags or a call to action) you can append to posts.',
  },
  {
    name: 'Approved Apps',
    availability: 'All plans',
    description:
      "Third-party apps you've granted access to your account — review and revoke them here.",
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Why can't I add more channels?",
    answer:
      'Each plan includes a fixed number of channels (3, 6 or 10, depending on the plan; trials are capped at 3). Upgrade in Billing to unlock more. Disconnected channels still occupy a slot until you delete them.',
  },
  {
    question: 'A post failed to publish — what should I do?',
    answer:
      "Open the post from the Calendar to see the error returned by the platform. The usual causes: the channel needs reconnecting (red badge on its avatar), the media doesn't meet the platform's requirements, or the platform flagged a duplicate. Fix the cause and reschedule — still stuck? Email us.",
  },
  {
    question: 'How does the trial work?',
    answer:
      "Paid plans start with a 7-day free trial, capped at 3 channels. Cancel any time in Billing before the trial ends and you won't be charged.",
  },
  {
    question: 'Can I post to multiple channels at once?',
    answer:
      'Yes — pick several channels when composing. Use the per-channel tabs in the editor to tweak the content for each platform before scheduling.',
  },
];
