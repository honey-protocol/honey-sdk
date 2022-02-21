import WalletAdapter from './walletAdapter';
import * as anchor from '@project-serum/anchor';
import { Wallet, MathWallet, SlopeWallet, SolongWallet, SolWindow, WalletProvider } from './walletType';

const connectWithPhantom = async () => {
  try {
    const { solana }: any = window;
    if (solana) {
      if (solana.isPhantom) {
        const response = await solana.connect({ onlyIfTrusted: false });
        return response;
      }
    } else {
      window.open('https://phantom.app/', '_blank')?.focus();
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const disconnectPhantom = async () => {
  try {
    const { solana }: any = window;
    await solana.disconnect();
  } catch (error) {
    throw error;
  }
};

const connectWithSolflareExtension = async () => {
  try {
    const { solflare }: any = window;
    if (solflare) {
      if (solflare.isSolflare) {
        await solflare.connect();
        return solflare;
      }
    } else {
      window.open('https://solflare.com/', '_blank')?.focus();
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const disconnectSolflareExtension = async () => {
  try {
    const { solflare }: any = window;
    await solflare.disconnect();
  } catch (error) {
    throw error;
  }
};
export const providers: WalletProvider[] = [
  {
    name: 'Phantom',
    logo: 'img/wallets/phantom.png',
    url: 'https://phantom.app/',
  },
  {
    name: 'Slope',
    logo: 'img/wallets/slope.png',
    url: 'https://slope.finance/',
  },
  {
    name: 'Solflare',
    logo: 'img/wallets/solflare.png',
    url: 'https://solflare.com/',
  },
  {
    name: 'Solong',
    logo: 'img/wallets/solong.png',
    url: 'https://solongwallet.com/',
  },
  {
    name: 'Sollet',
    logo: 'img/wallets/sollet.png',
    url: 'https://www.sollet.io/',
  },
  {
    name: 'Math Wallet',
    logo: 'img/wallets/math_wallet.png',
    url: 'https://mathwallet.org/en-us/',
  },
];

// Connect to user's wallet
export const getWalletAndAnchor = async (
  provider: WalletProvider,
): Promise<Wallet | SolongWallet | MathWallet | SlopeWallet> => {
  // Cast solana injected window type
  const solWindow = window as unknown as SolWindow;
  let wallet: Wallet | SolongWallet | MathWallet | SlopeWallet;

  // Wallet adapter or injected wallet setup
  if (provider.name === 'Phantom' && solWindow.solana?.isPhantom) {
    wallet = solWindow.solana as unknown as Wallet;
  } else if (provider.name === 'Solflare' && solWindow.solflare?.isSolflare) {
    wallet = solWindow.solflare as unknown as Wallet;
  } else if (provider.name === 'Slope' && !!solWindow.Slope) {
    wallet = new solWindow.Slope() as unknown as SlopeWallet;
    const { data } = await wallet.connect();
    if (data.publicKey) {
      wallet.publicKey = new anchor.web3.PublicKey(data.publicKey);
    }
    wallet.on = (action: string, callback: any) => {
      if (callback) callback();
    };
  } else if (provider.name === 'Math Wallet' && solWindow.solana?.isMathWallet) {
    wallet = solWindow.solana as unknown as MathWallet;
    wallet.publicKey = new anchor.web3.PublicKey(await solWindow.solana.getAccount());
    wallet.on = (action: string, callback: any) => {
      if (callback) callback();
    };
    wallet.connect = (action: string, callback: any) => {
      if (callback) callback();
    };
  } else if (provider.name === 'Solong' && solWindow.solong) {
    wallet = solWindow.solong as unknown as SolongWallet;
    wallet.publicKey = new anchor.web3.PublicKey(await solWindow.solong.selectAccount());
    wallet.on = (action: string, callback: Function) => {
      if (callback) callback();
    };
    wallet.connect = (action: string, callback: Function) => {
      if (callback) callback();
    };
  } else {
    wallet = new WalletAdapter(provider.url) as Wallet;
  }

  // // Initiate wallet connection
  try {
    await wallet.connect();
  } catch (err) {
    console.error(err);
  }

  return wallet;
};
