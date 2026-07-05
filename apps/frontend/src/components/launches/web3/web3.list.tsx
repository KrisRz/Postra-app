import { FC } from 'react';
import { Web3ProviderInterface } from '@gitroom/frontend/components/launches/web3/web3.provider.interface';
import { TelegramProvider } from '@gitroom/frontend/components/launches/web3/providers/telegram.provider';

// Telegram rides on the "web3" provider mechanism (isWeb3=true) even though it
// is a normal enabled channel — the "add the bot to your group" flow needs a
// custom component like the crypto providers did. The upstream Warpcast/Moltbook
// crypto providers were removed (Postra doesn't offer them).
export const web3List: {
  identifier: string;
  component: FC<Web3ProviderInterface>;
}[] = [
  {
    identifier: 'telegram',
    component: TelegramProvider,
  },
];
