import { PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { u64 } from '@solana/spl-token';

export { JetClient } from './client';
export { JetMarket, MarketFlags } from './market';
export { JetReserve } from './reserve';
export type { ReserveConfig } from './reserve';
export { JetUser } from './user';
export * from './derived-account';
export * from './token-amount';

export const PLACEHOLDER_ACCOUNT = PublicKey.default;

// export type AmountUnits = { tokens?: {} } | { depositNotes?: {} } | { loanNotes?: {} };
export type AmountUnits = { tokens?: {}; depositNotes?: {}; loanNotes?: {} };

export class Amount {
  constructor(public units: AmountUnits, public value: anchor.BN) {}

  static tokens(amount: number | u64): Amount {
    return new Amount({ tokens: {} }, new anchor.BN(amount));
  }

  static depositNotes(amount: number | u64): Amount {
    return new Amount({ depositNotes: {} }, new anchor.BN(amount));
  }

  static loanNotes(amount: number | u64): Amount {
    return new Amount({ loanNotes: {} }, new anchor.BN(amount));
  }
}
