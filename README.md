# Borrow & Lending Protocol for NFTs
Welcome to the Honey Finance SDK! The library to interact with the NFT Lending and Borrowing protocol built by HONEY.

## Installation
```bash
npm install @honey-finance/sdk
# or 
yarn add @honey-finance/sdk
```
# Project File Structure
### 1. Actions
#### Borrow
-   depositNFT: {@link depositNFT | `depositNFT` } 
-   withdrawNFT: {@link withdrawNFT | `withdrawNFT` } 
-   borrow: {@link borrow | `borrow` } 
-   repay: {@link repay | `repay` } 
#### Lend 

-   deposit: {@link deposit | `deposit` }
-   withdraw: {@link withdraw | `withdraw` }


### 2. contexts
-   AnchorProvider: {@link contexts.AnchorProvider | `AnchorProvider` }
-   HoneyProvider: {@link contexts.HoneyProvider | `HoneyProvider` }
-   useHoney: {@link contexts.useHoney | `useHoney` }
-   useAnchor: {@link contexts.useAnchor | `useAnchor` }


### 3. helpers
### 4. hooks
### 5. wrappers
    There are four major wrapper objects that represent important info about the on chain program
    * client (HoneyClient)
        ** Can be used to interact with the top level of the on-chain protocol.
        ** createMarket is the most interesting function here, this can be used once you've initalized the HoneyClient object to create new 
        lending and borrowing markets
    * market (HoneyMarket)
        ** Once the market is initalized this wrapper can be used to create and read reserves
    * user (HoneyUser)
        ** most important object. initalized when a user clicks on a nft market such that we derive the obligations and 
        can make on chain transactions
    * reserve (HoneyReserve)
        ** specifies the specific asset pool such as SOL, USDC, etc

# Running Tests

## Developing locally with the @honey-finance/sdk
Look for the secion on local testing in the article below

https://blog.logrocket.com/the-complete-guide-to-publishing-a-react-package-to-npm/

