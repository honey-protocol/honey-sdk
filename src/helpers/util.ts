import { BN } from '@project-serum/anchor';
import { RawAccount, RawMint } from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AggregatorAccount, loadSwitchboardProgram } from '@switchboard-xyz/switchboard-v2';

const JET_NUMBER: BN = new BN(10).pow(new BN(15));

export function onChainNumberToBN(state: BN): BN {
  return state.div(JET_NUMBER);
}

export const RoundHalfDown = (val: number, decimals: number = 2): number => {
  return Math.floor(val * 10 ** decimals) / 10 ** decimals;
};

export const RoundHalfUp = (val: number, decimals: number = 2): number => {
  return Math.ceil(val * 10 ** decimals) / 10 ** decimals;
};

// Format USD or crypto with default or desired decimals
export const currencyFormatter = (value: number, usd: boolean, digits?: number) => {
  let currencyFormat: Intl.NumberFormat;
  let uiCurrency: string;
  if (usd) {
    currencyFormat = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: digits ?? 2,
    });
  } else {
    currencyFormat = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits ?? 8,
      maximumFractionDigits: digits ?? 8,
    });
  }

  // Set and strip trailing 0's / unnecessary decimal if not USD
  uiCurrency = currencyFormat.format(value);
  if (!usd) {
    while (
      uiCurrency.indexOf('.') !== -1 &&
      (uiCurrency[uiCurrency.length - 1] === '0' || uiCurrency[uiCurrency.length - 1] === '.')
    ) {
      uiCurrency = uiCurrency.substring(0, uiCurrency.length - 1);
    }
  }

  return uiCurrency;
};

// Abbreviate large totals
export const totalAbbrev = (total: number, price?: number, native?: boolean, digits?: number): string => {
  let t = total;
  if (price && native === false) {
    t = total * price;
  }

  if (t > 1000000000) {
    return `${native ? '' : '$'}${(t / 1000000000).toFixed(1)}B`;
  } else if (t > 1000000) {
    return `${native ? '' : '$'}${(t / 1000000).toFixed(1)}M`;
  } else {
    return currencyFormatter(t, !native, native ? digits : 2);
  }
};

// Shorten a pubkey with ellipses
export const shortenPubkey = (pubkey: string, halfLength: number): string => {
  return `${pubkey.substring(0, halfLength)}...${pubkey.substring(pubkey.length - halfLength)}`;
};

// Manual timeout promise to pause program execution
export const timeout = (ms: number): Promise<boolean> => {
  return new Promise((res) => {
    setTimeout(() => res(true), ms);
  });
};

// Token Amounts
export class TokenAmount {
  /** Raw amount of token lamports */
  public amount: BN;
  /** Number of decimals configured for token's mint */
  public decimals: number;
  /** Token amount as string, accounts for decimals */
  public uiAmount: string;
  /** Token amount as a float, accounts for decimals. Imprecise at large numbers */
  public uiAmountFloat: number;

  constructor(amount: BN, decimals: number) {
    if (!BN.isBN(amount)) {
      console.warn('Amount is not a BN', amount);
      amount = new BN(0);
    }
    this.amount = amount;
    this.decimals = decimals;
    this.uiAmountFloat = TokenAmount.tokenAmount(amount, decimals);
    this.uiAmount = this.uiAmountFloat.toString();
  }

  public static zero(decimals: number) {
    return new TokenAmount(new BN(0), decimals ?? 0);
  }

  public static tokenAccount(tokenAccount: RawAccount, decimals: number) {
    return new TokenAmount(new BN(tokenAccount.amount.toString()), decimals);
  }

  public static mint(mint: RawMint) {
    return new TokenAmount(new BN(mint.supply.toString()), mint.decimals);
  }

  public static tokens(tokenAmount: string, decimals: number) {
    return new TokenAmount(TokenAmount.tokensToLamports(tokenAmount, decimals), decimals);
  }

  private static tokenAmount(lamports: BN, decimals: number) {
    const str = lamports.toString(10, decimals);
    return parseFloat(str.slice(0, -decimals) + '.' + str.slice(-decimals));
  }

  public static tokenPrice(marketValue: number, price: number, decimals: number) {
    const tokens = price !== 0 ? marketValue / price : 0;
    return TokenAmount.tokens(tokens.toFixed(decimals), decimals);
  }

  // Convert a uiAmount string into lamports BN
  private static tokensToLamports(uiAmount: string, decimals: number) {
    // Convert from exponential notation (7.46e-7) to regular
    if (uiAmount.indexOf('e+') !== -1 || uiAmount.indexOf('e-') !== -1) {
      uiAmount = Number(uiAmount).toLocaleString('fullwide', { useGrouping: false });
    }

    let lamports: string = uiAmount;

    // Remove commas
    while (lamports.indexOf(',') !== -1) {
      lamports = lamports.replace(',', '');
    }

    // Determine if there's a decimal, take number of
    // characters after it as fractionalValue
    let fractionalValue = 0;
    let initialPlace = lamports.indexOf('.');
    if (initialPlace !== -1) {
      fractionalValue = lamports.length - (initialPlace + 1);

      // If fractional value is lesser than a lamport, round to nearest lamport
      if (fractionalValue > decimals) {
        lamports = String(parseFloat(lamports).toFixed(decimals));
      }

      // Remove decimal
      lamports = lamports.replace('.', '');
    }

    // Append zeros
    for (let i = 0; i < decimals - fractionalValue; i++) {
      lamports += '0';
    }

    // Return BN value in lamports
    return new BN(lamports);
  }

  public add(b: TokenAmount) {
    return this.do(b, BN.prototype.add);
  }

  public addb(b: BN) {
    return new TokenAmount(this.amount.add(b), this.decimals);
  }

  public addn(b: number) {
    return new TokenAmount(this.amount.addn(b), this.decimals);
  }

  public sub(b: TokenAmount) {
    return this.do(b, BN.prototype.sub);
  }

  public subb(b: BN) {
    return new TokenAmount(this.amount.sub(b), this.decimals);
  }

  public subn(b: number) {
    return new TokenAmount(this.amount.subn(b), this.decimals);
  }

  public mul(b: TokenAmount) {
    return this.do(b, BN.prototype.mul);
  }

  public mulb(b: BN) {
    return new TokenAmount(this.amount.mul(b), this.decimals);
  }

  public muln(b: number) {
    return new TokenAmount(this.amount.muln(b), this.decimals);
  }

  public div(b: TokenAmount) {
    return this.do(b, BN.prototype.div);
  }

  public divb(b: BN) {
    return new TokenAmount(this.amount.div(b), this.decimals);
  }

  public divn(b: number) {
    return new TokenAmount(this.amount.divn(b), this.decimals);
  }

  public lt(b: TokenAmount) {
    return this.amount.lt(b.amount);
  }

  public gt(b: TokenAmount) {
    return this.amount.gt(b.amount);
  }

  public eq(b: TokenAmount) {
    return this.amount.eq(b.amount);
  }

  public isZero() {
    return this.amount.isZero();
  }

  private do(b: TokenAmount, fn: (b: BN) => BN) {
    if (this.decimals !== b.decimals) {
      console.warn('Decimal mismatch');
      return TokenAmount.zero(this.decimals);
    }
    let amount = fn.call(this.amount, b.amount);
    return new TokenAmount(amount, this.decimals);
  }
}

export const getHealthStatus = (debt: number, collaterl: number): string => {
  const ltv = (debt * 100) / collaterl;

  if (ltv < 20) return 'LOW';
  else if (ltv < 30) return 'MEDIUM';
  else if (ltv < 40) return 'HIGH';
  else return 'RISKY';
};

export async function getOraclePrice(
  cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta',
  connection: Connection,
  aggregatorKey: PublicKey,
): Promise<any> {
  // load the switchboard program
  const program = await loadSwitchboardProgram(
    cluster,
    connection,
    Keypair.fromSeed(new Uint8Array(32).fill(1)), // using dummy keypair since we wont be submitting any transactions
  );

  // load the switchboard aggregator
  const aggregator = new AggregatorAccount({
    program,
    publicKey: aggregatorKey,
  });

  // get the result
  const result = await aggregator.getLatestValue();
  console.log(`Switchboard Result: ${result}`);
  return result;
}
