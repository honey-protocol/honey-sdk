## Honey SDK
# Borrow & Lending Functions for NFTs

# Project File Structure
1. actions
2. contexts
3. helpers
4. hooks
5. wrappers
    There are four major wrapper objects that represent impornat info about the on chain program
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