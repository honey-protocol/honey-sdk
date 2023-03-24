# Borrow & Lending Protocol for NFTs

Welcome to the Honey Finance SDK! The library to interact with the NFT Lending and Borrowing protocol built by HONEY.

## Installation

```bash
npm install @honey-finance/sdk
# or
yarn add @honey-finance/sdk
```

## Actions

    Borrow
    depositNFT: {@link depositNFT | `depositNFT` }
    withdrawNFT: {@link withdrawNFT | `withdrawNFT` }
    borrow: {@link borrow | `borrow` }
    repay: {@link repay | `repay` }

    Lend
    deposit: {@link deposit | `deposit` }
    withdraw: {@link withdraw | `withdraw` }

## Contexts

    AnchorProvider: {@link contexts.AnchorProvider | `AnchorProvider` }
    HoneyProvider: {@link contexts.HoneyProvider | `HoneyProvider` }
    useHoney: {@link contexts.useHoney | `useHoney` }
    useAnchor: {@link contexts.useAnchor | `useAnchor` }

## FetchAllMarkets

    You can gather the majority of the information needed from the honey markets by using the fetchAllMarkets function in fetchAllMarkets.ts to gather the information. If needed there are helper functions in calculations.ts which parse some of the raw data from onchain to the

## Wrappers

    There are four major wrapper objects that represent important info about the on chain program
    HoneyClient
        1. Can be used to interact with the top level of the on-chain protocol.
        2. createMarket is the most interesting function here, this can be used once you've initalized the HoneyClient object to create new lending and borrowing markets

    HoneyMarket
        1. Once the market is initalized this wrapper can be used to create and read reserves
        2. It can be used to fetch the onchain data related to the wrapped market id. eg. MarketAccount, CachedReserveInfo and TReserve info
        3. Obligation data of the market can be fetched using fetchObligations

    HoneyUser
        1. returns user specific obligation data
        2. processes the low level ix (deposit, withdraw, borrow repay), but is wrapped by the action functions for simpler interface

    HoneyReserve
        1. specifies the specific asset pool such as SOL, USDC, etc
        2. can call fetchReserveValue to get the switchboard price oracle's most recent data
        3. can update reserve's configuration by calling updateReserveConfig

## Developing locally with the @honey-finance/sdk

Look for the secion on local testing in the article below

https://blog.logrocket.com/the-complete-guide-to-publishing-a-react-package-to-npm/
