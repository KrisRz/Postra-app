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

// Channels with a non-standard connect flow (bot dialog, credentials form,
// instance URL) come first — they generate the most confusion.
export const CHANNEL_GUIDES: ChannelGuide[] = [
  { identifier: 'telegram', name: 'Telegram', connectType: 'bot', steps: [], gotchas: [] },
  { identifier: 'bluesky', name: 'Bluesky', connectType: 'credentials', steps: [], gotchas: [] },
  { identifier: 'mastodon', name: 'Mastodon', connectType: 'oauth', steps: [], gotchas: [] },
  { identifier: 'facebook', name: 'Facebook', connectType: 'oauth', steps: [], gotchas: [] },
  { identifier: 'instagram', name: 'Instagram', connectType: 'oauth', steps: [], gotchas: [] },
  { identifier: 'threads', name: 'Threads', connectType: 'oauth', steps: [], gotchas: [] },
  { identifier: 'x', name: 'X (Twitter)', connectType: 'oauth', steps: [], gotchas: [] },
  { identifier: 'linkedin', name: 'LinkedIn', connectType: 'oauth', steps: [], gotchas: [] },
  { identifier: 'linkedin-page', name: 'LinkedIn Page', connectType: 'oauth', steps: [], gotchas: [] },
  { identifier: 'youtube', name: 'YouTube', connectType: 'oauth', steps: [], gotchas: [] },
  { identifier: 'tiktok', name: 'TikTok', connectType: 'oauth', steps: [], gotchas: [] },
];

export const APP_TABS: AppTabGuide[] = [
  { id: 'calendar', name: 'Calendar', description: '' },
  { id: 'agent', name: 'Agent', description: '' },
  { id: 'analytics', name: 'Analytics', description: '' },
  { id: 'studio', name: 'Studio', description: '' },
  { id: 'autopost', name: 'Auto Post', description: '' },
  { id: 'media', name: 'Media', description: '' },
  { id: 'plugs', name: 'Plugs', description: '' },
  { id: 'billing', name: 'Billing', description: '' },
  { id: 'settings', name: 'Settings', description: '' },
];

export const SETTINGS_SECTIONS: SettingsSectionGuide[] = [
  { name: 'Global Settings', availability: 'All plans', description: '' },
  { name: 'Teams', availability: 'Plans with team seats', description: '' },
  { name: 'Webhooks', availability: 'Plans with webhooks', description: '' },
  { name: 'Auto Post', availability: 'Plans with Auto Post', description: '' },
  { name: 'Sets', availability: 'Paid plans', description: '' },
  { name: 'Signatures', availability: 'Paid plans', description: '' },
  { name: 'Approved Apps', availability: 'All plans', description: '' },
];

export const FAQ_ITEMS: FaqItem[] = [
  { question: "Why can't I add more channels?", answer: '' },
  { question: 'A post failed to publish — what should I do?', answer: '' },
  { question: 'How does the trial work?', answer: '' },
  { question: 'Can I post to multiple channels at once?', answer: '' },
];
