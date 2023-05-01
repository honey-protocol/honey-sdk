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

## 👷🏼 Developing locally with the @honey-finance/sdk

In order to develop locally with the @honey-finance/sdk we need to run a couple of configurations. <br>
First up, we want to create a folder that we name e.g. local_honey_setup:

```bash
$ mkdir local_honey_setup
```
We can now cd into the folder and clone the SDK;
```bash
$ cd local_honey_setup
$ git clone https://github.com/honey-protocol/honey-sdk.git
```
Now that we are inside the local_honey_setup folder, make sure your project (Front-end supposedly) is inside the same folder, this is for convenience.

In order to eliminate potential conflicts by previous attempts on linking the project, you can list your exitsting links by running;
```bash
$ cat ~/.config/yarn/link
```
If there are any present regarding the linking of the honey-sdk, make sure to remove those. Navigate to the folder where the links exist and run the following commands;
```bash
$ cd ~/.config/yarn/link 
$ ls # shows you existing links
$ rm -rf folder_name # folder name presents the folder you want to delete
```
Now that we have that setup, we can start the actual linking. 
Open two terminal windows, in the frist, navigate to your front-end, in the second one navigate to the SDK. In both terminals run the yarn (or npm) install command;
```bash
$ yarn install # both in the front-end and in the sdk folder
```
Now in the terminal where you have the SDK open, in the root run the following commmands;
```bash
$ yarn build # builds the project into the dist folder which is being served to the front-end 
$ yarn link # sets the link in our .config/yarn/link folder and allows us to link the honey-sdk in our FED
```
In your terminal window where you have the FED open, in the root - run the following commands;
```bash
$ yarn link @honey-finance/sdk # links the sdk
$ cd node_modules/react # navigate to the react package
$ yarn link # link the react package to overrule the react package of the SDK
$ cd ../react-dom # navigate to the react-dom package to do the exact same thing
$ yarn link # link react-dom over SDK react-dom package 
```
Now navigate to the root of the SDK in your terminal and link the react / react-dom packages by running the following command;
```bash
$ yarn link react
$ yarn link react-dom
```

Et voila! You should be good to go.
Any problems during the setup, don't hesitate to reach out.