export type Honey = {
  version: '0.1.0';
  name: 'honey';
  instructions: [
    {
      name: 'initMarket';
      docs: ['Initialize a new empty market with a given owner.'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'oraclePrice';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'owner';
          type: 'publicKey';
        },
        {
          name: 'quoteCurrency';
          type: 'string';
        },
        {
          name: 'quoteTokenMint';
          type: 'publicKey';
        },
        {
          name: 'nftCollectionCreator';
          type: 'publicKey';
        },
      ];
    },
    {
      name: 'initReserve';
      docs: ['Initialize a new reserve in a market with some initial liquidity.'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
          docs: ['The market the new reserve is being added to.'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account, which owns the vault"];
        },
        {
          name: 'reserve';
          isMut: true;
          isSigner: false;
          docs: ['The new account to store data about the reserve'];
        },
        {
          name: 'vault';
          isMut: true;
          isSigner: false;
          docs: ['The account to hold custody of the tokens being', 'controlled by this reserve.'];
        },
        {
          name: 'depositNoteMint';
          isMut: true;
          isSigner: false;
          docs: ['The mint for notes which will represent user deposits'];
        },
        {
          name: 'feeNoteVault';
          isMut: true;
          isSigner: false;
          docs: ['The account to hold the notes created from fees collected by the reserve'];
        },
        {
          name: 'protocolFeeNoteVault';
          isMut: true;
          isSigner: false;
          docs: ['The account to hold the notes created from protocol fees collected by the reserve'];
        },
        {
          name: 'tokenMint';
          isMut: false;
          isSigner: false;
          docs: ['The mint for the token being stored in this reserve.'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
          docs: ['The program for interacting with the token.'];
        },
        {
          name: 'switchboardPriceAggregator';
          isMut: false;
          isSigner: false;
          docs: ['The account containing the price information for the token.'];
        },
        {
          name: 'loanNoteMint';
          isMut: true;
          isSigner: false;
          docs: ['The mint for notes which will represent user loans'];
        },
        {
          name: 'owner';
          isMut: true;
          isSigner: true;
          docs: ['The market owner, which must sign to make this change to the market.'];
        },
        {
          name: 'associatedTokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: {
            defined: 'InitReserveBumpSeeds';
          };
        },
        {
          name: 'config';
          type: {
            defined: 'ReserveConfig';
          };
        },
      ];
    },
    {
      name: 'updateReserveConfig';
      docs: ['Replace an existing reserve config'];
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'reserve';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'owner';
          isMut: false;
          isSigner: true;
        },
      ];
      args: [
        {
          name: 'newConfig';
          type: {
            defined: 'ReserveConfig';
          };
        },
      ];
    },
    {
      name: 'initDepositAccount';
      docs: ['Initialize an account that can be used to store deposit notes'];
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
          docs: ['The relevant market this deposit is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'reserve';
          isMut: false;
          isSigner: false;
          docs: ['The reserve being deposited into'];
        },
        {
          name: 'depositNoteMint';
          isMut: false;
          isSigner: false;
          docs: ['The mint for the deposit notes'];
        },
        {
          name: 'depositor';
          isMut: true;
          isSigner: true;
          docs: ['The user/authority that will own the deposits'];
        },
        {
          name: 'depositAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that will store the deposit notes'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: 'u8';
        },
      ];
    },
    {
      name: 'initLoanAccount';
      docs: ['Initialize an account that can be used to store deposit notes as collateral'];
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
          docs: ['The relevant market this loan is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation the loan account is used for'];
        },
        {
          name: 'reserve';
          isMut: false;
          isSigner: false;
          docs: ['The reserve that the loan comes from'];
        },
        {
          name: 'loanNoteMint';
          isMut: false;
          isSigner: false;
          docs: ['The mint for the loan notes being used as loan'];
        },
        {
          name: 'owner';
          isMut: true;
          isSigner: true;
          docs: ['The user/authority that owns the loan'];
        },
        {
          name: 'loanAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that will store the loan notes'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: 'u8';
        },
      ];
    },
    {
      name: 'initObligation';
      docs: ['Initialize an account that can be used to borrow from a reserve'];
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
          docs: ['The relevant market'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'borrower';
          isMut: true;
          isSigner: true;
          docs: ['The user/authority that is responsible for owning this obligation.'];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ["The new account to track information about the borrower's loan,", 'such as the collateral put up.'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: 'u8';
        },
      ];
    },
    {
      name: 'setMarketOwner';
      docs: ['Change the owner on a market'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'owner';
          isMut: false;
          isSigner: true;
        },
      ];
      args: [
        {
          name: 'newOwner';
          type: 'publicKey';
        },
      ];
    },
    {
      name: 'setMarketFlags';
      docs: ['Change the flags on a market'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'owner';
          isMut: false;
          isSigner: true;
        },
      ];
      args: [
        {
          name: 'flags';
          type: 'u64';
        },
      ];
    },
    {
      name: 'depositTokens';
      docs: ['Deposit tokens into a reserve (unmanaged)'];
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
          docs: ['The relevant market this deposit is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'reserve';
          isMut: true;
          isSigner: false;
          docs: ['The reserve being deposited into'];
        },
        {
          name: 'vault';
          isMut: true;
          isSigner: false;
          docs: ["The reserve's vault where the deposited tokens will be transferred to"];
        },
        {
          name: 'depositNoteMint';
          isMut: true;
          isSigner: false;
          docs: ['The mint for the deposit notes'];
        },
        {
          name: 'depositor';
          isMut: false;
          isSigner: true;
          docs: ['The user/authority that owns the deposit'];
        },
        {
          name: 'depositAccount';
          isMut: true;
          isSigner: false;
          docs: ['The token account to receive the deposit notes'];
        },
        {
          name: 'depositSource';
          isMut: true;
          isSigner: false;
          docs: ['The token account with the tokens to be deposited'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: 'u8';
        },
        {
          name: 'amount';
          type: {
            defined: 'Amount';
          };
        },
      ];
    },
    {
      name: 'withdrawTokens';
      docs: ['Withdraw tokens from a reserve (unmanaged)'];
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
          docs: ['The relevant market this withdraw is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'reserve';
          isMut: true;
          isSigner: false;
          docs: ['The reserve being withdrawn from'];
        },
        {
          name: 'vault';
          isMut: true;
          isSigner: false;
          docs: ["The reserve's vault where the withdrawn tokens will be transferred from"];
        },
        {
          name: 'depositNoteMint';
          isMut: true;
          isSigner: false;
          docs: ['The mint for the deposit notes'];
        },
        {
          name: 'depositor';
          isMut: false;
          isSigner: true;
          docs: ['The user/authority that owns the deposit'];
        },
        {
          name: 'depositNoteAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that stores the deposit notes'];
        },
        {
          name: 'withdrawAccount';
          isMut: true;
          isSigner: false;
          docs: ['The token account where to transfer withdrawn tokens to'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: 'u8';
        },
        {
          name: 'amount';
          type: {
            defined: 'Amount';
          };
        },
      ];
    },
    {
      name: 'depositNft';
      docs: ['Deposit notes as collateral in an obligation'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
          docs: ['The relevant market this deposit is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation the collateral is being deposited toward'];
        },
        {
          name: 'owner';
          isMut: true;
          isSigner: true;
          docs: ['The user/authority that owns the deposit'];
        },
        {
          name: 'depositSource';
          isMut: true;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes"];
        },
        {
          name: 'depositNftMint';
          isMut: true;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes"];
        },
        {
          name: 'nftCollectionCreator';
          isMut: false;
          isSigner: false;
          docs: ['verified collection creator'];
        },
        {
          name: 'metadata';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'collateralAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that will store the deposit nft as collateral'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'associatedTokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'metadataBump';
          type: 'u8';
        },
      ];
    },
    {
      name: 'depositPnft';
      docs: ['Deposit notes as collateral in an obligation'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
          docs: ['The relevant market this deposit is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation the collateral is being deposited toward'];
        },
        {
          name: 'owner';
          isMut: true;
          isSigner: true;
          docs: ['The user/authority that owns the deposit'];
        },
        {
          name: 'depositSource';
          isMut: true;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes"];
        },
        {
          name: 'depositNftMint';
          isMut: true;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes"];
        },
        {
          name: 'nftMetadata';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftEdition';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'ownerTokenRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'destTokenRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftCollectionCreator';
          isMut: false;
          isSigner: false;
          docs: ['verified collection creator'];
        },
        {
          name: 'collateralAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that will store the deposit nft as collateral'];
        },
        {
          name: 'pnftShared';
          accounts: [
            {
              name: 'tokenMetadataProgram';
              isMut: false;
              isSigner: false;
            },
            {
              name: 'instructions';
              isMut: false;
              isSigner: false;
            },
            {
              name: 'authorizationRulesProgram';
              isMut: false;
              isSigner: false;
            },
          ];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'associatedTokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'metadataBump';
          type: 'u8';
        },
        {
          name: 'authorizationData';
          type: {
            option: {
              defined: 'AuthorizationDataLocal';
            };
          };
        },
        {
          name: 'rulesAccPresent';
          type: 'bool';
        },
      ];
    },
    {
      name: 'withdrawNft';
      docs: ['Withdraw notes previously deposited as collateral in an obligation'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
          docs: ['The relevant market the collateral is in'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation the collateral is being withdrawn from', 'todo verify depositor?'];
        },
        {
          name: 'owner';
          isMut: false;
          isSigner: true;
          docs: ['The user/authority that owns the deposited collateral (depositor)'];
        },
        {
          name: 'depositTo';
          isMut: true;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes, where", 'the collateral will be returned to.'];
        },
        {
          name: 'nftCollectionCreator';
          isMut: false;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes"];
        },
        {
          name: 'metadata';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'depositNftMint';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'collateralAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that contains the collateral to be withdrawn'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'metadataBump';
          type: 'u8';
        },
      ];
    },
    {
      name: 'withdrawPnft';
      docs: ['Withdraw notes previously deposited as collateral in an obligation'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
          docs: ['The relevant market the collateral is in'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation the collateral is being withdrawn from', 'todo verify depositor?'];
        },
        {
          name: 'owner';
          isMut: false;
          isSigner: true;
          docs: ['The user/authority that owns the deposited collateral (depositor)'];
        },
        {
          name: 'depositTo';
          isMut: true;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes, where", 'the collateral will be returned to.'];
        },
        {
          name: 'nftCollectionCreator';
          isMut: false;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes"];
        },
        {
          name: 'depositNftMint';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftMetadata';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftEdition';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'ownerTokenRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'destTokenRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'collateralAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that contains the collateral to be withdrawn'];
        },
        {
          name: 'pnftShared';
          accounts: [
            {
              name: 'tokenMetadataProgram';
              isMut: false;
              isSigner: false;
            },
            {
              name: 'instructions';
              isMut: false;
              isSigner: false;
            },
            {
              name: 'authorizationRulesProgram';
              isMut: false;
              isSigner: false;
            },
          ];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'associatedTokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'metadataBump';
          type: 'u8';
        },
        {
          name: 'authorizationData';
          type: {
            option: {
              defined: 'AuthorizationDataLocal';
            };
          };
        },
        {
          name: 'rulesAccPresent';
          type: 'bool';
        },
      ];
    },
    {
      name: 'borrow';
      docs: ['Borrow tokens from a reserve'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
          docs: ['The relevant market this borrow is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation with collateral to borrow with'];
        },
        {
          name: 'reserve';
          isMut: true;
          isSigner: false;
          docs: ['The reserve being borrowed from'];
        },
        {
          name: 'vault';
          isMut: true;
          isSigner: false;
          docs: ["The reserve's vault where the borrowed tokens will be transferred from"];
        },
        {
          name: 'loanNoteMint';
          isMut: true;
          isSigner: false;
          docs: ['The mint for the debt/loan notes'];
        },
        {
          name: 'borrower';
          isMut: false;
          isSigner: true;
          docs: ['The user/authority that is borrowing'];
        },
        {
          name: 'loanAccount';
          isMut: true;
          isSigner: false;
          docs: ["The account to track the borrower's balance to repay"];
        },
        {
          name: 'receiverAccount';
          isMut: true;
          isSigner: false;
          docs: ['The token account that the borrowed funds will be transferred to'];
        },
        {
          name: 'tokenMint';
          isMut: false;
          isSigner: false;
          docs: ['The mint for the token being stored in this reserve.'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'nftSwitchboardPriceAggregator';
          isMut: false;
          isSigner: false;
          docs: ['-- MIGHT NOT NEED THIS IF WE REQUIRE REFRESH RESERVE'];
        },
      ];
      args: [
        {
          name: 'bump';
          type: {
            defined: 'BorrowBumpSeeds';
          };
        },
        {
          name: 'amount';
          type: {
            defined: 'Amount';
          };
        },
      ];
    },
    {
      name: 'repay';
      docs: ['Repay a loan'];
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
          docs: ['The relevant market this repayment is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation with debt to be repaid'];
        },
        {
          name: 'reserve';
          isMut: true;
          isSigner: false;
          docs: ['The reserve that the debt is from'];
        },
        {
          name: 'vault';
          isMut: true;
          isSigner: false;
          docs: ["The reserve's vault where the payment will be transferred to"];
        },
        {
          name: 'loanNoteMint';
          isMut: true;
          isSigner: false;
          docs: ['The mint for the debt/loan notes'];
        },
        {
          name: 'loanAccount';
          isMut: true;
          isSigner: false;
          docs: ["The account that holds the borrower's debt balance"];
        },
        {
          name: 'payerAccount';
          isMut: true;
          isSigner: false;
          docs: ['The token account that the payment funds will be transferred from'];
        },
        {
          name: 'payer';
          isMut: false;
          isSigner: true;
          docs: ['The account repaying the loan'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'amount';
          type: {
            defined: 'Amount';
          };
        },
      ];
    },
    {
      name: 'liquidateSolvent';
      docs: ['liquidate through solvent droplets'];
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'reserve';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'vault';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation with debt to be repaid'];
        },
        {
          name: 'loanNoteMint';
          isMut: true;
          isSigner: false;
          docs: ['The mint for the debt/loan notes'];
        },
        {
          name: 'collateralAccount';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'loanAccount';
          isMut: true;
          isSigner: false;
          docs: ["The account that holds the borrower's debt balance"];
        },
        {
          name: 'nftMint';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'executor';
          isMut: true;
          isSigner: true;
          docs: ['The admin/authority that has permission to execute solvent liquidation'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'amount';
          type: {
            defined: 'Amount';
          };
        },
      ];
    },
    {
      name: 'withdrawNftSolvent';
      docs: ['Withdraw notes previously deposited as collateral in an obligation'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
          docs: ['The relevant market the collateral is in'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation the collateral is being withdrawn from', 'todo verify depositor?'];
        },
        {
          name: 'withdrawer';
          isMut: false;
          isSigner: true;
          docs: ['The admin who will own the nft'];
        },
        {
          name: 'depositTo';
          isMut: true;
          isSigner: false;
          docs: [
            "The account that stores the withdrawer's deposit notes, where",
            'the collateral will be transferred to.',
          ];
        },
        {
          name: 'nftCollectionCreator';
          isMut: false;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes"];
        },
        {
          name: 'metadata';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'depositNftMint';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'collateralAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that contains the collateral to be withdrawn'];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'metadataBump';
          type: 'u8';
        },
      ];
    },
    {
      name: 'withdrawPnftSolvent';
      docs: ['Withdraw notes previously deposited as collateral in an obligation'];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
          docs: ['The relevant market the collateral is in'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation the collateral is being withdrawn from', 'todo verify depositor?'];
        },
        {
          name: 'withdrawer';
          isMut: false;
          isSigner: true;
          docs: ['The admin who will own the nft'];
        },
        {
          name: 'depositTo';
          isMut: true;
          isSigner: false;
          docs: [
            "The account that stores the withdrawer's deposit notes, where",
            'the collateral will be transferred to.',
          ];
        },
        {
          name: 'nftCollectionCreator';
          isMut: false;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes"];
        },
        {
          name: 'depositNftMint';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftMetadata';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftEdition';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'ownerTokenRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'destTokenRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'collateralAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that contains the collateral to be withdrawn'];
        },
        {
          name: 'pnftShared';
          accounts: [
            {
              name: 'tokenMetadataProgram';
              isMut: false;
              isSigner: false;
            },
            {
              name: 'instructions';
              isMut: false;
              isSigner: false;
            },
            {
              name: 'authorizationRulesProgram';
              isMut: false;
              isSigner: false;
            },
          ];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'associatedTokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'metadataBump';
          type: 'u8';
        },
        {
          name: 'authorizationData';
          type: {
            option: {
              defined: 'AuthorizationDataLocal';
            };
          };
        },
        {
          name: 'rulesAccPresent';
          type: 'bool';
        },
      ];
    },
    {
      name: 'placeLiquidateBid';
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'bid';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidder';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'depositSource';
          isMut: true;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes"];
        },
        {
          name: 'bidMint';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'bidEscrow';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidEscrowAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: {
            defined: 'PlaceLiquidateBidBumps';
          };
        },
        {
          name: 'bidLimit';
          type: 'u64';
        },
      ];
    },
    {
      name: 'increaseLiquidateBid';
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'bid';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidder';
          isMut: false;
          isSigner: true;
        },
        {
          name: 'depositSource';
          isMut: true;
          isSigner: false;
          docs: ["The account that stores the user's deposit notes"];
        },
        {
          name: 'bidMint';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'bidEscrow';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidEscrowAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: {
            defined: 'IncreaseLiquidateBidBumps';
          };
        },
        {
          name: 'bidIncrease';
          type: 'u64';
        },
      ];
    },
    {
      name: 'revokeLiquidateBid';
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'bid';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidder';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'withdrawDestination';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidMint';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'bidEscrow';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidEscrowAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: {
            defined: 'RevokeLiquidateBidBumps';
          };
        },
      ];
    },
    {
      name: 'executeLiquidateBid';
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
          docs: ['The relevant market this liquidation is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation with debt to be repaid'];
        },
        {
          name: 'reserve';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'vault';
          isMut: true;
          isSigner: false;
          docs: ["The reserve's vault where the payment will be transferred to"];
        },
        {
          name: 'loanNoteMint';
          isMut: true;
          isSigner: false;
          docs: ['The mint for the debt/loan notes'];
        },
        {
          name: 'loanAccount';
          isMut: true;
          isSigner: false;
          docs: ["The account that holds the borrower's debt balance"];
        },
        {
          name: 'bid';
          isMut: true;
          isSigner: false;
          docs: ["The account that holds the borrower's collateral"];
        },
        {
          name: 'bidder';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'rootAuthority';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidMint';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'bidEscrow';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidEscrowAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'nftMint';
          isMut: false;
          isSigner: false;
          docs: ['mint of the nft you are liquidating'];
        },
        {
          name: 'collateralAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that stores the nft'];
        },
        {
          name: 'receiverAccount';
          isMut: true;
          isSigner: false;
          docs: ["The account that will receive a portion of the borrower's collateral"];
        },
        {
          name: 'liquidationFeeReceiver';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'leftoversReceiver';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'payer';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'associatedTokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: {
            defined: 'ExecuteLiquidateBidBumps';
          };
        },
      ];
    },
    {
      name: 'executeLiquidatePnftBid';
      accounts: [
        {
          name: 'market';
          isMut: false;
          isSigner: false;
          docs: ['The relevant market this liquidation is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'obligation';
          isMut: true;
          isSigner: false;
          docs: ['The obligation with debt to be repaid'];
        },
        {
          name: 'reserve';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'vault';
          isMut: true;
          isSigner: false;
          docs: ["The reserve's vault where the payment will be transferred to"];
        },
        {
          name: 'loanNoteMint';
          isMut: true;
          isSigner: false;
          docs: ['The mint for the debt/loan notes'];
        },
        {
          name: 'loanAccount';
          isMut: true;
          isSigner: false;
          docs: ["The account that holds the borrower's debt balance"];
        },
        {
          name: 'bid';
          isMut: true;
          isSigner: false;
          docs: ["The account that holds the borrower's collateral"];
        },
        {
          name: 'bidder';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'rootAuthority';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidMint';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'bidEscrow';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'bidEscrowAuthority';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'nftMint';
          isMut: false;
          isSigner: false;
          docs: ['mint of the nft you are liquidating'];
        },
        {
          name: 'nftMetadata';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'nftEdition';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'ownerTokenRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'destTokenRecord';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'collateralAccount';
          isMut: true;
          isSigner: false;
          docs: ['The account that stores the nft'];
        },
        {
          name: 'receiverAccount';
          isMut: true;
          isSigner: false;
          docs: ["The account that will receive a portion of the borrower's collateral"];
        },
        {
          name: 'liquidationFeeReceiver';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'leftoversReceiver';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'payer';
          isMut: true;
          isSigner: true;
        },
        {
          name: 'pnftShared';
          accounts: [
            {
              name: 'tokenMetadataProgram';
              isMut: false;
              isSigner: false;
            },
            {
              name: 'instructions';
              isMut: false;
              isSigner: false;
            },
            {
              name: 'authorizationRulesProgram';
              isMut: false;
              isSigner: false;
            },
          ];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'systemProgram';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'rent';
          isMut: false;
          isSigner: false;
        },
        {
          name: 'associatedTokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [
        {
          name: 'bump';
          type: {
            defined: 'ExecuteLiquidatePNFTBidBumps';
          };
        },
        {
          name: 'authorizationData';
          type: {
            option: {
              defined: 'AuthorizationDataLocal';
            };
          };
        },
        {
          name: 'rulesAccPresent';
          type: 'bool';
        },
      ];
    },
    {
      name: 'refreshReserve';
      docs: [
        "Refresh a reserve's market price and interest owed",
        '',
        'If the reserve is extremely stale, only a partial update will be',
        'performed. It may be necessary to call refresh_reserve multiple',
        'times to get the reserve up to date.',
      ];
      accounts: [
        {
          name: 'market';
          isMut: true;
          isSigner: false;
          docs: ['The relevant market this refresh is for'];
        },
        {
          name: 'marketAuthority';
          isMut: false;
          isSigner: false;
          docs: ["The market's authority account"];
        },
        {
          name: 'reserve';
          isMut: true;
          isSigner: false;
          docs: ['The reserve being refreshed'];
        },
        {
          name: 'feeNoteVault';
          isMut: true;
          isSigner: false;
          docs: ["The reserve's vault for storing collected fees"];
        },
        {
          name: 'protocolFeeNoteVault';
          isMut: true;
          isSigner: false;
        },
        {
          name: 'depositNoteMint';
          isMut: true;
          isSigner: false;
          docs: ["The reserve's mint for deposit notes"];
        },
        {
          name: 'switchboardPriceAggregator';
          isMut: false;
          isSigner: false;
          docs: ['The account containing the price information for the token.'];
        },
        {
          name: 'nftSwitchboardPriceAggregator';
          isMut: false;
          isSigner: false;
          docs: [
            'the account containing the price information for the nfts in this collection',
            'CHECK market must have a nft_switchboard_price_aggregator account',
          ];
        },
        {
          name: 'tokenProgram';
          isMut: false;
          isSigner: false;
        },
      ];
      args: [];
    },
  ];
  accounts: [
    {
      name: 'bid';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'market';
            type: 'publicKey';
          },
          {
            name: 'bidEscrow';
            type: 'publicKey';
          },
          {
            name: 'bidEscrowAuthority';
            type: 'publicKey';
          },
          {
            name: 'bidMint';
            type: 'publicKey';
          },
          {
            name: 'authorityBumpSeed';
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'authoritySeed';
            type: 'publicKey';
          },
          {
            name: 'bidder';
            type: 'publicKey';
          },
          {
            name: 'bidLimit';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'market';
      docs: ['Lending market account'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'version';
            type: 'u32';
          },
          {
            name: 'quoteExponent';
            docs: ['The exponent used for quote prices'];
            type: 'i32';
          },
          {
            name: 'quoteCurrency';
            docs: ['The exponent used for quote prices', 'The currency used for quote prices'];
            type: {
              array: ['u8', 15];
            };
          },
          {
            name: 'authorityBumpSeed';
            docs: ['The bump seed value for generating the authority address.'];
            type: {
              array: ['u8', 1];
            };
          },
          {
            name: 'authoritySeed';
            docs: [
              'The address used as the seed for generating the market authority',
              "address. Typically this is the market account's own address.",
            ];
            type: 'publicKey';
          },
          {
            name: 'marketAuthority';
            docs: ['The account derived by the program, which has authority over all', 'assets in the market.'];
            type: 'publicKey';
          },
          {
            name: 'owner';
            docs: ['The account that has authority to make changes to the market'];
            type: 'publicKey';
          },
          {
            name: 'quoteTokenMint';
            docs: ['The mint for the token used to quote the value for reserve assets.'];
            type: 'publicKey';
          },
          {
            name: 'nftSwitchboardPriceAggregator';
            docs: ['The account where a Pyth oracle keeps the updated price of the token.'];
            type: 'publicKey';
          },
          {
            name: 'nftCollectionCreator';
            docs: ['The mint for the token being held in this reserve'];
            type: 'publicKey';
          },
          {
            name: 'flags';
            docs: ['Storage for flags that can be set on the market.'];
            type: 'u64';
          },
          {
            name: 'marketOracleState';
            docs: ['oracle price data'];
            type: {
              array: ['u8', 24];
            };
          },
          {
            name: 'reserved';
            docs: ['Unused space before start of reserve list'];
            type: {
              array: ['u8', 352];
            };
          },
          {
            name: 'reserves';
            docs: ['The storage for information on reserves in the market'];
            type: {
              array: ['u8', 12288];
            };
          },
        ];
      };
    },
    {
      name: 'obligation';
      docs: ["Tracks information about a user's obligation to repay a borrowed position."];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'version';
            type: 'u32';
          },
          {
            name: 'reserved0';
            type: 'u32';
          },
          {
            name: 'market';
            docs: ['The market this obligation is a part of'];
            type: 'publicKey';
          },
          {
            name: 'owner';
            docs: ['The address that owns the debt/assets as a part of this obligation'];
            type: 'publicKey';
          },
          {
            name: 'reserved1';
            docs: ['Unused space before start of collateral info'];
            type: {
              array: ['u8', 184];
            };
          },
          {
            name: 'collateralNftMint';
            docs: ['stores collateral nft key'];
            type: {
              array: ['publicKey', 11];
            };
          },
          {
            name: 'cached';
            docs: ['The storage for cached calculations'];
            type: {
              array: ['u8', 256];
            };
          },
          {
            name: 'loans';
            docs: ['The storage for the information on positions owed by this obligation'];
            type: {
              array: ['u8', 2048];
            };
          },
        ];
      };
    },
    {
      name: 'reserve';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'version';
            type: 'u16';
          },
          {
            name: 'index';
            docs: ['The unique id for this reserve within the market'];
            type: 'u16';
          },
          {
            name: 'exponent';
            docs: ['The base 10 decimals used for token values'];
            type: 'i32';
          },
          {
            name: 'market';
            docs: ['The market this reserve is a part of.'];
            type: 'publicKey';
          },
          {
            name: 'switchboardPriceAggregator';
            docs: ['The account where a Pyth oracle keeps the updated price of the token.'];
            type: 'publicKey';
          },
          {
            name: 'tokenMint';
            docs: ['The mint for the token being held in this reserve'];
            type: 'publicKey';
          },
          {
            name: 'depositNoteMint';
            docs: ["The mint for this reserve's deposit notes"];
            type: 'publicKey';
          },
          {
            name: 'loanNoteMint';
            docs: ["The mint for this reserve's loan notes"];
            type: 'publicKey';
          },
          {
            name: 'vault';
            docs: ["The account with custody over the reserve's tokens."];
            type: 'publicKey';
          },
          {
            name: 'feeNoteVault';
            docs: ['The account with custody of the notes generated from collected fees'];
            type: 'publicKey';
          },
          {
            name: 'protocolFeeNoteVault';
            docs: ['The account with custody of the notes generated from protocol collected fees'];
            type: 'publicKey';
          },
          {
            name: 'reserved0';
            type: {
              array: ['u8', 408];
            };
          },
          {
            name: 'config';
            type: {
              defined: 'ReserveConfig';
            };
          },
          {
            name: 'reserved1';
            type: {
              array: ['u8', 704];
            };
          },
          {
            name: 'state';
            type: {
              array: ['u8', 536];
            };
          },
        ];
      };
    },
  ];
  types: [
    {
      name: 'Amount';
      docs: ['Represent an amount of some value (like tokens, or notes)'];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'units';
            type: {
              defined: 'AmountUnits';
            };
          },
          {
            name: 'value';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'BorrowBumpSeeds';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'loanAccount';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'ExecuteLiquidateBidBumps';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bid';
            type: 'u8';
          },
          {
            name: 'bidEscrow';
            type: 'u8';
          },
          {
            name: 'bidEscrowAuthority';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'ExecuteLiquidatePNFTBidBumps';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bid';
            type: 'u8';
          },
          {
            name: 'bidEscrow';
            type: 'u8';
          },
          {
            name: 'bidEscrowAuthority';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'IncreaseLiquidateBidBumps';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bid';
            type: 'u8';
          },
          {
            name: 'bidEscrow';
            type: 'u8';
          },
          {
            name: 'bidEscrowAuthority';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'InitReserveBumpSeeds';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'vault';
            type: 'u8';
          },
          {
            name: 'feeNoteVault';
            type: 'u8';
          },
          {
            name: 'protocolFeeNoteVault';
            type: 'u8';
          },
          {
            name: 'depositNoteMint';
            type: 'u8';
          },
          {
            name: 'loanNoteMint';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'PlaceLiquidateBidBumps';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bid';
            type: 'u8';
          },
          {
            name: 'bidEscrow';
            type: 'u8';
          },
          {
            name: 'bidEscrowAuthority';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'RevokeLiquidateBidBumps';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'bid';
            type: 'u8';
          },
          {
            name: 'bidEscrow';
            type: 'u8';
          },
          {
            name: 'bidEscrowAuthority';
            type: 'u8';
          },
        ];
      };
    },
    {
      name: 'AuthorizationDataLocal';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'payload';
            type: {
              vec: {
                defined: 'TaggedPayload';
              };
            };
          },
        ];
      };
    },
    {
      name: 'TaggedPayload';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'name';
            type: 'string';
          },
          {
            name: 'payload';
            type: {
              defined: 'PayloadTypeLocal';
            };
          },
        ];
      };
    },
    {
      name: 'SeedsVecLocal';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'seeds';
            docs: ['The vector of derivation seeds.'];
            type: {
              vec: 'bytes';
            };
          },
        ];
      };
    },
    {
      name: 'ProofInfoLocal';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'proof';
            docs: ['The merkle proof.'];
            type: {
              vec: {
                array: ['u8', 32];
              };
            };
          },
        ];
      };
    },
    {
      name: 'ReserveConfig';
      docs: [
        'We have three interest rate regimes. The rate is described by a continuous,',
        'piecewise-linear function of the utilization rate:',
        '1. zero to [utilization_rate_1]: borrow rate increases linearly from',
        '[borrow_rate_0] to [borrow_rate_1].',
        '2. [utilization_rate_1] to [utilization_rate_2]: borrow rate increases linearly',
        'from [borrow_rate_1] to [borrow_rate_2].',
        '3. [utilization_rate_2] to one: borrow rate increases linearly from',
        '[borrow_rate_2] to [borrow_rate_3].',
        '',
        'Interest rates are nominal annual amounts, compounded continuously with',
        'a day-count convention of actual-over-365. The accrual period is determined',
        'by counting slots, and comparing against the number of slots per year.',
      ];
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'utilizationRate1';
            docs: ['The utilization rate at which we switch from the first to second regime.'];
            type: 'u16';
          },
          {
            name: 'utilizationRate2';
            docs: ['The utilization rate at which we switch from the second to third regime.'];
            type: 'u16';
          },
          {
            name: 'borrowRate0';
            docs: [
              'The lowest borrow rate in the first regime. Essentially the minimum',
              'borrow rate possible for the reserve.',
            ];
            type: 'u16';
          },
          {
            name: 'borrowRate1';
            docs: ['The borrow rate at the transition point from the first to second regime.'];
            type: 'u16';
          },
          {
            name: 'borrowRate2';
            docs: ['The borrow rate at the transition point from the second to thirs regime.'];
            type: 'u16';
          },
          {
            name: 'borrowRate3';
            docs: [
              'The highest borrow rate in the third regime. Essentially the maximum',
              'borrow rate possible for the reserve.',
            ];
            type: 'u16';
          },
          {
            name: 'minCollateralRatio';
            docs: ['The minimum allowable collateralization ratio for an obligation'];
            type: 'u16';
          },
          {
            name: 'liquidationPremium';
            docs: ['The amount given as a bonus to a liquidator'];
            type: 'u16';
          },
          {
            name: 'manageFeeCollectionThreshold';
            docs: ['The threshold at which to collect the fees accumulated from interest into', 'real deposit notes.'];
            type: 'u64';
          },
          {
            name: 'manageFeeRate';
            docs: ['The fee rate applied to the interest payments collected'];
            type: 'u16';
          },
          {
            name: 'loanOriginationFee';
            docs: ['The fee rate applied as interest owed on new loans'];
            type: 'u16';
          },
          {
            name: 'reserved0';
            docs: [
              'Represented as a percentage of the Price',
              'confidence values above this will not be accepted',
              'The maximum token amount to allow in a single DEX trade when',
              'liquidating assetr from this reserve as collateral.',
              'unused',
            ];
            type: 'u16';
          },
          {
            name: 'reserved1';
            type: {
              array: ['u8', 24];
            };
          },
          {
            name: 'reserved2';
            type: {
              array: ['u8', 10];
            };
          },
        ];
      };
    },
    {
      name: 'AmountUnits';
      docs: ['Specifies the units of some amount of value'];
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Tokens';
          },
          {
            name: 'DepositNotes';
          },
          {
            name: 'LoanNotes';
          },
        ];
      };
    },
    {
      name: 'Rounding';
      docs: ['Specifies rounding integers up or down'];
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Up';
          },
          {
            name: 'Down';
          },
        ];
      };
    },
    {
      name: 'PayloadTypeLocal';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Pubkey';
            fields: ['publicKey'];
          },
          {
            name: 'Seeds';
            fields: [
              {
                defined: 'SeedsVecLocal';
              },
            ];
          },
          {
            name: 'MerkleProof';
            fields: [
              {
                defined: 'ProofInfoLocal';
              },
            ];
          },
          {
            name: 'Number';
            fields: ['u64'];
          },
        ];
      };
    },
    {
      name: 'CacheInvalidError';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Expired';
            fields: [
              {
                name: 'msg';
                type: 'string';
              },
            ];
          },
          {
            name: 'TooNew';
            fields: [
              {
                name: 'msg';
                type: 'string';
              },
            ];
          },
          {
            name: 'Invalidated';
          },
          {
            name: 'MathOverflow';
          },
        ];
      };
    },
    {
      name: 'Side';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Loan';
          },
        ];
      };
    },
    {
      name: 'JobCompletion';
      type: {
        kind: 'enum';
        variants: [
          {
            name: 'Partial';
          },
          {
            name: 'Full';
          },
        ];
      };
    },
  ];
  events: [
    {
      name: 'BorrowEvent';
      fields: [
        {
          name: 'borrower';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'reserve';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'debt';
          type: 'u64';
          index: false;
        },
      ];
    },
    {
      name: 'DepositCollateralEvent';
      fields: [
        {
          name: 'depositor';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'market';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'amount';
          type: 'u64';
          index: false;
        },
      ];
    },
    {
      name: 'DepositCollateralEvent';
      fields: [
        {
          name: 'depositor';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'market';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'amount';
          type: 'u64';
          index: false;
        },
      ];
    },
    {
      name: 'ExecuteLiquidateEvent';
      fields: [
        {
          name: 'bid';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'owner';
          type: 'publicKey';
          index: false;
        },
      ];
    },
    {
      name: 'ExecuteLiquidateEvent';
      fields: [
        {
          name: 'bid';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'owner';
          type: 'publicKey';
          index: false;
        },
      ];
    },
    {
      name: 'IncreaseBidEvent';
      fields: [
        {
          name: 'bid';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'bidder';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'bidLimit';
          type: 'u64';
          index: false;
        },
        {
          name: 'bidIncrease';
          type: 'u64';
          index: false;
        },
      ];
    },
    {
      name: 'LiquidateSolventEvent';
      fields: [
        {
          name: 'owner';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'nftMint';
          type: 'publicKey';
          index: false;
        },
      ];
    },
    {
      name: 'PlaceBidEvent';
      fields: [
        {
          name: 'bid';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'bidder';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'bidLimit';
          type: 'u64';
          index: false;
        },
      ];
    },
    {
      name: 'RepayEvent';
      fields: [
        {
          name: 'borrower';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'reserve';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'amount';
          type: {
            defined: 'Amount';
          };
          index: false;
        },
      ];
    },
    {
      name: 'RevokeBidEvent';
      fields: [
        {
          name: 'bid';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'bidder';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'bidLimit';
          type: 'u64';
          index: false;
        },
      ];
    },
    {
      name: 'SolventWithdrawEvent';
      fields: [
        {
          name: 'withdrawer';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'market';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'amount';
          type: 'u64';
          index: false;
        },
      ];
    },
    {
      name: 'WithdrawCollateralEvent';
      fields: [
        {
          name: 'depositor';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'market';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'amount';
          type: 'u64';
          index: false;
        },
      ];
    },
    {
      name: 'SolventWithdrawEvent';
      fields: [
        {
          name: 'withdrawer';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'market';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'amount';
          type: 'u64';
          index: false;
        },
      ];
    },
    {
      name: 'WithdrawCollateralEvent';
      fields: [
        {
          name: 'depositor';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'market';
          type: 'publicKey';
          index: false;
        },
        {
          name: 'amount';
          type: 'u64';
          index: false;
        },
      ];
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'MetadataError';
      msg: 'Metdata error';
    },
    {
      code: 6001;
      name: 'ArithmeticError';
      msg: 'failed to perform some math operation safely';
    },
    {
      code: 6002;
      name: 'VerifiedCreatorMismatch';
      msg: "verified creator doesn't match with the current market";
    },
    {
      code: 6003;
      name: 'InvalidOracle';
      msg: 'oracle account provided is not valid';
    },
    {
      code: 6004;
      name: 'NoFreeReserves';
      msg: 'no free space left to add a new reserve in the market';
    },
    {
      code: 6005;
      name: 'NoFreeObligation';
      msg: 'no free space left to add the new loan or collateral in an obligation';
    },
    {
      code: 6006;
      name: 'NftCollateralExists';
      msg: 'nft collateral position already exists';
    },
    {
      code: 6007;
      name: 'UnregisteredPosition';
      msg: "the obligation account doesn't have any record of the loan or collateral account";
    },
    {
      code: 6008;
      name: 'UnregisteredNFTPosition';
      msg: 'the nft collateral mint does not exist';
    },
    {
      code: 6009;
      name: 'InvalidOraclePrice';
      msg: 'the oracle price account has an invalid price value';
    },
    {
      code: 6010;
      name: 'InsufficientCollateral';
      msg: 'there is not enough collateral deposited to borrow against';
    },
    {
      code: 6011;
      name: 'SimultaneousDepositAndBorrow';
      msg: 'cannot both deposit collateral to and borrow from the same reserve';
    },
    {
      code: 6012;
      name: 'ObligationHealthy';
      msg: 'cannot liquidate a healthy position';
    },
    {
      code: 6013;
      name: 'ObligationUnhealthy';
      msg: 'cannot perform an action that would leave the obligation unhealthy';
    },
    {
      code: 6014;
      name: 'ExceptionalReserveState';
      msg: 'reserve requires special action; call refresh_reserve until up to date';
    },
    {
      code: 6015;
      name: 'InvalidAmountUnits';
      msg: 'the units provided in the amount are not valid for the instruction';
    },
    {
      code: 6016;
      name: 'InvalidDexMarketMints';
      msg: "the tokens in the DEX market don't match the reserve and lending market quote token";
    },
    {
      code: 6017;
      name: 'InvalidMarketAuthority';
      msg: "the market authority provided doesn't match the market account";
    },
    {
      code: 6018;
      name: 'InvalidLiquidationQuoteTokenAccount';
      msg: 'the quote token account provided cannot be used for liquidations';
    },
    {
      code: 6019;
      name: 'ObligationAccountMismatch';
      msg: "the obligation account doesn't have the collateral/loan registered";
    },
    {
      code: 6020;
      name: 'UnknownInstruction';
      msg: 'unknown instruction';
    },
    {
      code: 6021;
      name: 'Disallowed';
      msg: 'current conditions prevent an action from being performed';
    },
    {
      code: 6022;
      name: 'LiquidationSwapSlipped';
      msg: 'the actual slipped amount on the DEX trade exceeded the threshold configured';
    },
    {
      code: 6023;
      name: 'CollateralValueTooSmall';
      msg: 'the collateral value is too small for a DEX trade';
    },
    {
      code: 6024;
      name: 'LiquidationLowCollateral';
      msg: 'the collateral returned by the liquidation is smaller than requested';
    },
    {
      code: 6025;
      name: 'NotSupported';
      msg: 'this action is currently not supported by this version of the program';
    },
    {
      code: 6026;
      name: 'MarketHalted';
      msg: 'the market has currently halted this kind of operation';
    },
    {
      code: 6027;
      name: 'InvalidParameter';
      msg: 'a given parameter is not valid';
    },
    {
      code: 6028;
      name: 'PositionNotEmpty';
      msg: 'the obligation account still holds position in the loan or collateral account';
    },
    {
      code: 6029;
      name: 'ObligationPositionNotFound';
      msg: 'position not found in an obligation';
    },
    {
      code: 6030;
      name: 'AccountNotEmptyError';
      msg: 'the collateral/loan account is not empty';
    },
    {
      code: 6031;
      name: 'InvalidMetadata';
      msg: 'invalid metadata ';
    },
    {
      code: 6032;
      name: 'BidMintMismatch';
      msg: "the liquidation bid's token account doesn't match the reserve";
    },
    {
      code: 6033;
      name: 'InvalidAuthority';
      msg: 'Invalid authority given to place a bid';
    },
    {
      code: 6034;
      name: 'MathOverflow';
      msg: 'Math overflow error';
    },
    {
      code: 6035;
      name: 'AnotherLoanOutstanding';
      msg: 'Obligation only allows for one loan at a time';
    },
    {
      code: 6036;
      name: 'BadRuleset';
      msg: 'bad ruleset passed';
    },
    {
      code: 6037;
      name: 'BadMetadata';
      msg: 'bad metadata passed';
    },
  ];
};

export const IDL: Honey = {
  version: '0.1.0',
  name: 'honey',
  instructions: [
    {
      name: 'initMarket',
      docs: ['Initialize a new empty market with a given owner.'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'oraclePrice',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'owner',
          type: 'publicKey',
        },
        {
          name: 'quoteCurrency',
          type: 'string',
        },
        {
          name: 'quoteTokenMint',
          type: 'publicKey',
        },
        {
          name: 'nftCollectionCreator',
          type: 'publicKey',
        },
      ],
    },
    {
      name: 'initReserve',
      docs: ['Initialize a new reserve in a market with some initial liquidity.'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
          docs: ['The market the new reserve is being added to.'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account, which owns the vault"],
        },
        {
          name: 'reserve',
          isMut: true,
          isSigner: false,
          docs: ['The new account to store data about the reserve'],
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ['The account to hold custody of the tokens being', 'controlled by this reserve.'],
        },
        {
          name: 'depositNoteMint',
          isMut: true,
          isSigner: false,
          docs: ['The mint for notes which will represent user deposits'],
        },
        {
          name: 'feeNoteVault',
          isMut: true,
          isSigner: false,
          docs: ['The account to hold the notes created from fees collected by the reserve'],
        },
        {
          name: 'protocolFeeNoteVault',
          isMut: true,
          isSigner: false,
          docs: ['The account to hold the notes created from protocol fees collected by the reserve'],
        },
        {
          name: 'tokenMint',
          isMut: false,
          isSigner: false,
          docs: ['The mint for the token being stored in this reserve.'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
          docs: ['The program for interacting with the token.'],
        },
        {
          name: 'switchboardPriceAggregator',
          isMut: false,
          isSigner: false,
          docs: ['The account containing the price information for the token.'],
        },
        {
          name: 'loanNoteMint',
          isMut: true,
          isSigner: false,
          docs: ['The mint for notes which will represent user loans'],
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: true,
          docs: ['The market owner, which must sign to make this change to the market.'],
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: {
            defined: 'InitReserveBumpSeeds',
          },
        },
        {
          name: 'config',
          type: {
            defined: 'ReserveConfig',
          },
        },
      ],
    },
    {
      name: 'updateReserveConfig',
      docs: ['Replace an existing reserve config'],
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'reserve',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'newConfig',
          type: {
            defined: 'ReserveConfig',
          },
        },
      ],
    },
    {
      name: 'initDepositAccount',
      docs: ['Initialize an account that can be used to store deposit notes'],
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
          docs: ['The relevant market this deposit is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'reserve',
          isMut: false,
          isSigner: false,
          docs: ['The reserve being deposited into'],
        },
        {
          name: 'depositNoteMint',
          isMut: false,
          isSigner: false,
          docs: ['The mint for the deposit notes'],
        },
        {
          name: 'depositor',
          isMut: true,
          isSigner: true,
          docs: ['The user/authority that will own the deposits'],
        },
        {
          name: 'depositAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that will store the deposit notes'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: 'u8',
        },
      ],
    },
    {
      name: 'initLoanAccount',
      docs: ['Initialize an account that can be used to store deposit notes as collateral'],
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
          docs: ['The relevant market this loan is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation the loan account is used for'],
        },
        {
          name: 'reserve',
          isMut: false,
          isSigner: false,
          docs: ['The reserve that the loan comes from'],
        },
        {
          name: 'loanNoteMint',
          isMut: false,
          isSigner: false,
          docs: ['The mint for the loan notes being used as loan'],
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: true,
          docs: ['The user/authority that owns the loan'],
        },
        {
          name: 'loanAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that will store the loan notes'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: 'u8',
        },
      ],
    },
    {
      name: 'initObligation',
      docs: ['Initialize an account that can be used to borrow from a reserve'],
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
          docs: ['The relevant market'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'borrower',
          isMut: true,
          isSigner: true,
          docs: ['The user/authority that is responsible for owning this obligation.'],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ["The new account to track information about the borrower's loan,", 'such as the collateral put up.'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: 'u8',
        },
      ],
    },
    {
      name: 'setMarketOwner',
      docs: ['Change the owner on a market'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'newOwner',
          type: 'publicKey',
        },
      ],
    },
    {
      name: 'setMarketFlags',
      docs: ['Change the flags on a market'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'owner',
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: 'flags',
          type: 'u64',
        },
      ],
    },
    {
      name: 'depositTokens',
      docs: ['Deposit tokens into a reserve (unmanaged)'],
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
          docs: ['The relevant market this deposit is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'reserve',
          isMut: true,
          isSigner: false,
          docs: ['The reserve being deposited into'],
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ["The reserve's vault where the deposited tokens will be transferred to"],
        },
        {
          name: 'depositNoteMint',
          isMut: true,
          isSigner: false,
          docs: ['The mint for the deposit notes'],
        },
        {
          name: 'depositor',
          isMut: false,
          isSigner: true,
          docs: ['The user/authority that owns the deposit'],
        },
        {
          name: 'depositAccount',
          isMut: true,
          isSigner: false,
          docs: ['The token account to receive the deposit notes'],
        },
        {
          name: 'depositSource',
          isMut: true,
          isSigner: false,
          docs: ['The token account with the tokens to be deposited'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: 'u8',
        },
        {
          name: 'amount',
          type: {
            defined: 'Amount',
          },
        },
      ],
    },
    {
      name: 'withdrawTokens',
      docs: ['Withdraw tokens from a reserve (unmanaged)'],
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
          docs: ['The relevant market this withdraw is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'reserve',
          isMut: true,
          isSigner: false,
          docs: ['The reserve being withdrawn from'],
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ["The reserve's vault where the withdrawn tokens will be transferred from"],
        },
        {
          name: 'depositNoteMint',
          isMut: true,
          isSigner: false,
          docs: ['The mint for the deposit notes'],
        },
        {
          name: 'depositor',
          isMut: false,
          isSigner: true,
          docs: ['The user/authority that owns the deposit'],
        },
        {
          name: 'depositNoteAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that stores the deposit notes'],
        },
        {
          name: 'withdrawAccount',
          isMut: true,
          isSigner: false,
          docs: ['The token account where to transfer withdrawn tokens to'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: 'u8',
        },
        {
          name: 'amount',
          type: {
            defined: 'Amount',
          },
        },
      ],
    },
    {
      name: 'depositNft',
      docs: ['Deposit notes as collateral in an obligation'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
          docs: ['The relevant market this deposit is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation the collateral is being deposited toward'],
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: true,
          docs: ['The user/authority that owns the deposit'],
        },
        {
          name: 'depositSource',
          isMut: true,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes"],
        },
        {
          name: 'depositNftMint',
          isMut: true,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes"],
        },
        {
          name: 'nftCollectionCreator',
          isMut: false,
          isSigner: false,
          docs: ['verified collection creator'],
        },
        {
          name: 'metadata',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'collateralAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that will store the deposit nft as collateral'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'metadataBump',
          type: 'u8',
        },
      ],
    },
    {
      name: 'depositPnft',
      docs: ['Deposit notes as collateral in an obligation'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
          docs: ['The relevant market this deposit is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation the collateral is being deposited toward'],
        },
        {
          name: 'owner',
          isMut: true,
          isSigner: true,
          docs: ['The user/authority that owns the deposit'],
        },
        {
          name: 'depositSource',
          isMut: true,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes"],
        },
        {
          name: 'depositNftMint',
          isMut: true,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes"],
        },
        {
          name: 'nftMetadata',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftEdition',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'ownerTokenRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'destTokenRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftCollectionCreator',
          isMut: false,
          isSigner: false,
          docs: ['verified collection creator'],
        },
        {
          name: 'collateralAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that will store the deposit nft as collateral'],
        },
        {
          name: 'pnftShared',
          accounts: [
            {
              name: 'tokenMetadataProgram',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'instructions',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'authorizationRulesProgram',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'metadataBump',
          type: 'u8',
        },
        {
          name: 'authorizationData',
          type: {
            option: {
              defined: 'AuthorizationDataLocal',
            },
          },
        },
        {
          name: 'rulesAccPresent',
          type: 'bool',
        },
      ],
    },
    {
      name: 'withdrawNft',
      docs: ['Withdraw notes previously deposited as collateral in an obligation'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
          docs: ['The relevant market the collateral is in'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation the collateral is being withdrawn from', 'todo verify depositor?'],
        },
        {
          name: 'owner',
          isMut: false,
          isSigner: true,
          docs: ['The user/authority that owns the deposited collateral (depositor)'],
        },
        {
          name: 'depositTo',
          isMut: true,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes, where", 'the collateral will be returned to.'],
        },
        {
          name: 'nftCollectionCreator',
          isMut: false,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes"],
        },
        {
          name: 'metadata',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'depositNftMint',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'collateralAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that contains the collateral to be withdrawn'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'metadataBump',
          type: 'u8',
        },
      ],
    },
    {
      name: 'withdrawPnft',
      docs: ['Withdraw notes previously deposited as collateral in an obligation'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
          docs: ['The relevant market the collateral is in'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation the collateral is being withdrawn from', 'todo verify depositor?'],
        },
        {
          name: 'owner',
          isMut: false,
          isSigner: true,
          docs: ['The user/authority that owns the deposited collateral (depositor)'],
        },
        {
          name: 'depositTo',
          isMut: true,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes, where", 'the collateral will be returned to.'],
        },
        {
          name: 'nftCollectionCreator',
          isMut: false,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes"],
        },
        {
          name: 'depositNftMint',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftMetadata',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftEdition',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'ownerTokenRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'destTokenRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'collateralAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that contains the collateral to be withdrawn'],
        },
        {
          name: 'pnftShared',
          accounts: [
            {
              name: 'tokenMetadataProgram',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'instructions',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'authorizationRulesProgram',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'metadataBump',
          type: 'u8',
        },
        {
          name: 'authorizationData',
          type: {
            option: {
              defined: 'AuthorizationDataLocal',
            },
          },
        },
        {
          name: 'rulesAccPresent',
          type: 'bool',
        },
      ],
    },
    {
      name: 'borrow',
      docs: ['Borrow tokens from a reserve'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
          docs: ['The relevant market this borrow is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation with collateral to borrow with'],
        },
        {
          name: 'reserve',
          isMut: true,
          isSigner: false,
          docs: ['The reserve being borrowed from'],
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ["The reserve's vault where the borrowed tokens will be transferred from"],
        },
        {
          name: 'loanNoteMint',
          isMut: true,
          isSigner: false,
          docs: ['The mint for the debt/loan notes'],
        },
        {
          name: 'borrower',
          isMut: false,
          isSigner: true,
          docs: ['The user/authority that is borrowing'],
        },
        {
          name: 'loanAccount',
          isMut: true,
          isSigner: false,
          docs: ["The account to track the borrower's balance to repay"],
        },
        {
          name: 'receiverAccount',
          isMut: true,
          isSigner: false,
          docs: ['The token account that the borrowed funds will be transferred to'],
        },
        {
          name: 'tokenMint',
          isMut: false,
          isSigner: false,
          docs: ['The mint for the token being stored in this reserve.'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'nftSwitchboardPriceAggregator',
          isMut: false,
          isSigner: false,
          docs: ['-- MIGHT NOT NEED THIS IF WE REQUIRE REFRESH RESERVE'],
        },
      ],
      args: [
        {
          name: 'bump',
          type: {
            defined: 'BorrowBumpSeeds',
          },
        },
        {
          name: 'amount',
          type: {
            defined: 'Amount',
          },
        },
      ],
    },
    {
      name: 'repay',
      docs: ['Repay a loan'],
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
          docs: ['The relevant market this repayment is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation with debt to be repaid'],
        },
        {
          name: 'reserve',
          isMut: true,
          isSigner: false,
          docs: ['The reserve that the debt is from'],
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ["The reserve's vault where the payment will be transferred to"],
        },
        {
          name: 'loanNoteMint',
          isMut: true,
          isSigner: false,
          docs: ['The mint for the debt/loan notes'],
        },
        {
          name: 'loanAccount',
          isMut: true,
          isSigner: false,
          docs: ["The account that holds the borrower's debt balance"],
        },
        {
          name: 'payerAccount',
          isMut: true,
          isSigner: false,
          docs: ['The token account that the payment funds will be transferred from'],
        },
        {
          name: 'payer',
          isMut: false,
          isSigner: true,
          docs: ['The account repaying the loan'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'amount',
          type: {
            defined: 'Amount',
          },
        },
      ],
    },
    {
      name: 'liquidateSolvent',
      docs: ['liquidate through solvent droplets'],
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'reserve',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vault',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation with debt to be repaid'],
        },
        {
          name: 'loanNoteMint',
          isMut: true,
          isSigner: false,
          docs: ['The mint for the debt/loan notes'],
        },
        {
          name: 'collateralAccount',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'loanAccount',
          isMut: true,
          isSigner: false,
          docs: ["The account that holds the borrower's debt balance"],
        },
        {
          name: 'nftMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'executor',
          isMut: true,
          isSigner: true,
          docs: ['The admin/authority that has permission to execute solvent liquidation'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'amount',
          type: {
            defined: 'Amount',
          },
        },
      ],
    },
    {
      name: 'withdrawNftSolvent',
      docs: ['Withdraw notes previously deposited as collateral in an obligation'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
          docs: ['The relevant market the collateral is in'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation the collateral is being withdrawn from', 'todo verify depositor?'],
        },
        {
          name: 'withdrawer',
          isMut: false,
          isSigner: true,
          docs: ['The admin who will own the nft'],
        },
        {
          name: 'depositTo',
          isMut: true,
          isSigner: false,
          docs: [
            "The account that stores the withdrawer's deposit notes, where",
            'the collateral will be transferred to.',
          ],
        },
        {
          name: 'nftCollectionCreator',
          isMut: false,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes"],
        },
        {
          name: 'metadata',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'depositNftMint',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'collateralAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that contains the collateral to be withdrawn'],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'metadataBump',
          type: 'u8',
        },
      ],
    },
    {
      name: 'withdrawPnftSolvent',
      docs: ['Withdraw notes previously deposited as collateral in an obligation'],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
          docs: ['The relevant market the collateral is in'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation the collateral is being withdrawn from', 'todo verify depositor?'],
        },
        {
          name: 'withdrawer',
          isMut: false,
          isSigner: true,
          docs: ['The admin who will own the nft'],
        },
        {
          name: 'depositTo',
          isMut: true,
          isSigner: false,
          docs: [
            "The account that stores the withdrawer's deposit notes, where",
            'the collateral will be transferred to.',
          ],
        },
        {
          name: 'nftCollectionCreator',
          isMut: false,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes"],
        },
        {
          name: 'depositNftMint',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftMetadata',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftEdition',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'ownerTokenRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'destTokenRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'collateralAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that contains the collateral to be withdrawn'],
        },
        {
          name: 'pnftShared',
          accounts: [
            {
              name: 'tokenMetadataProgram',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'instructions',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'authorizationRulesProgram',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'metadataBump',
          type: 'u8',
        },
        {
          name: 'authorizationData',
          type: {
            option: {
              defined: 'AuthorizationDataLocal',
            },
          },
        },
        {
          name: 'rulesAccPresent',
          type: 'bool',
        },
      ],
    },
    {
      name: 'placeLiquidateBid',
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'bid',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidder',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'depositSource',
          isMut: true,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes"],
        },
        {
          name: 'bidMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'bidEscrow',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidEscrowAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: {
            defined: 'PlaceLiquidateBidBumps',
          },
        },
        {
          name: 'bidLimit',
          type: 'u64',
        },
      ],
    },
    {
      name: 'increaseLiquidateBid',
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'bid',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidder',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'depositSource',
          isMut: true,
          isSigner: false,
          docs: ["The account that stores the user's deposit notes"],
        },
        {
          name: 'bidMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'bidEscrow',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidEscrowAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: {
            defined: 'IncreaseLiquidateBidBumps',
          },
        },
        {
          name: 'bidIncrease',
          type: 'u64',
        },
      ],
    },
    {
      name: 'revokeLiquidateBid',
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'bid',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidder',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'withdrawDestination',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'bidEscrow',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidEscrowAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: {
            defined: 'RevokeLiquidateBidBumps',
          },
        },
      ],
    },
    {
      name: 'executeLiquidateBid',
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
          docs: ['The relevant market this liquidation is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation with debt to be repaid'],
        },
        {
          name: 'reserve',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ["The reserve's vault where the payment will be transferred to"],
        },
        {
          name: 'loanNoteMint',
          isMut: true,
          isSigner: false,
          docs: ['The mint for the debt/loan notes'],
        },
        {
          name: 'loanAccount',
          isMut: true,
          isSigner: false,
          docs: ["The account that holds the borrower's debt balance"],
        },
        {
          name: 'bid',
          isMut: true,
          isSigner: false,
          docs: ["The account that holds the borrower's collateral"],
        },
        {
          name: 'bidder',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'rootAuthority',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'bidEscrow',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidEscrowAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'nftMint',
          isMut: false,
          isSigner: false,
          docs: ['mint of the nft you are liquidating'],
        },
        {
          name: 'collateralAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that stores the nft'],
        },
        {
          name: 'receiverAccount',
          isMut: true,
          isSigner: false,
          docs: ["The account that will receive a portion of the borrower's collateral"],
        },
        {
          name: 'liquidationFeeReceiver',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'leftoversReceiver',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: {
            defined: 'ExecuteLiquidateBidBumps',
          },
        },
      ],
    },
    {
      name: 'executeLiquidatePnftBid',
      accounts: [
        {
          name: 'market',
          isMut: false,
          isSigner: false,
          docs: ['The relevant market this liquidation is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'obligation',
          isMut: true,
          isSigner: false,
          docs: ['The obligation with debt to be repaid'],
        },
        {
          name: 'reserve',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'vault',
          isMut: true,
          isSigner: false,
          docs: ["The reserve's vault where the payment will be transferred to"],
        },
        {
          name: 'loanNoteMint',
          isMut: true,
          isSigner: false,
          docs: ['The mint for the debt/loan notes'],
        },
        {
          name: 'loanAccount',
          isMut: true,
          isSigner: false,
          docs: ["The account that holds the borrower's debt balance"],
        },
        {
          name: 'bid',
          isMut: true,
          isSigner: false,
          docs: ["The account that holds the borrower's collateral"],
        },
        {
          name: 'bidder',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'rootAuthority',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidMint',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'bidEscrow',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'bidEscrowAuthority',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'nftMint',
          isMut: false,
          isSigner: false,
          docs: ['mint of the nft you are liquidating'],
        },
        {
          name: 'nftMetadata',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'nftEdition',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'ownerTokenRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'destTokenRecord',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'collateralAccount',
          isMut: true,
          isSigner: false,
          docs: ['The account that stores the nft'],
        },
        {
          name: 'receiverAccount',
          isMut: true,
          isSigner: false,
          docs: ["The account that will receive a portion of the borrower's collateral"],
        },
        {
          name: 'liquidationFeeReceiver',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'leftoversReceiver',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'pnftShared',
          accounts: [
            {
              name: 'tokenMetadataProgram',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'instructions',
              isMut: false,
              isSigner: false,
            },
            {
              name: 'authorizationRulesProgram',
              isMut: false,
              isSigner: false,
            },
          ],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'rent',
          isMut: false,
          isSigner: false,
        },
        {
          name: 'associatedTokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'bump',
          type: {
            defined: 'ExecuteLiquidatePNFTBidBumps',
          },
        },
        {
          name: 'authorizationData',
          type: {
            option: {
              defined: 'AuthorizationDataLocal',
            },
          },
        },
        {
          name: 'rulesAccPresent',
          type: 'bool',
        },
      ],
    },
    {
      name: 'refreshReserve',
      docs: [
        "Refresh a reserve's market price and interest owed",
        '',
        'If the reserve is extremely stale, only a partial update will be',
        'performed. It may be necessary to call refresh_reserve multiple',
        'times to get the reserve up to date.',
      ],
      accounts: [
        {
          name: 'market',
          isMut: true,
          isSigner: false,
          docs: ['The relevant market this refresh is for'],
        },
        {
          name: 'marketAuthority',
          isMut: false,
          isSigner: false,
          docs: ["The market's authority account"],
        },
        {
          name: 'reserve',
          isMut: true,
          isSigner: false,
          docs: ['The reserve being refreshed'],
        },
        {
          name: 'feeNoteVault',
          isMut: true,
          isSigner: false,
          docs: ["The reserve's vault for storing collected fees"],
        },
        {
          name: 'protocolFeeNoteVault',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'depositNoteMint',
          isMut: true,
          isSigner: false,
          docs: ["The reserve's mint for deposit notes"],
        },
        {
          name: 'switchboardPriceAggregator',
          isMut: false,
          isSigner: false,
          docs: ['The account containing the price information for the token.'],
        },
        {
          name: 'nftSwitchboardPriceAggregator',
          isMut: false,
          isSigner: false,
          docs: [
            'the account containing the price information for the nfts in this collection',
            'CHECK market must have a nft_switchboard_price_aggregator account',
          ],
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'bid',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'market',
            type: 'publicKey',
          },
          {
            name: 'bidEscrow',
            type: 'publicKey',
          },
          {
            name: 'bidEscrowAuthority',
            type: 'publicKey',
          },
          {
            name: 'bidMint',
            type: 'publicKey',
          },
          {
            name: 'authorityBumpSeed',
            type: {
              array: ['u8', 1],
            },
          },
          {
            name: 'authoritySeed',
            type: 'publicKey',
          },
          {
            name: 'bidder',
            type: 'publicKey',
          },
          {
            name: 'bidLimit',
            type: 'u64',
          },
        ],
      },
    },
    {
      name: 'market',
      docs: ['Lending market account'],
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'version',
            type: 'u32',
          },
          {
            name: 'quoteExponent',
            docs: ['The exponent used for quote prices'],
            type: 'i32',
          },
          {
            name: 'quoteCurrency',
            docs: ['The exponent used for quote prices', 'The currency used for quote prices'],
            type: {
              array: ['u8', 15],
            },
          },
          {
            name: 'authorityBumpSeed',
            docs: ['The bump seed value for generating the authority address.'],
            type: {
              array: ['u8', 1],
            },
          },
          {
            name: 'authoritySeed',
            docs: [
              'The address used as the seed for generating the market authority',
              "address. Typically this is the market account's own address.",
            ],
            type: 'publicKey',
          },
          {
            name: 'marketAuthority',
            docs: ['The account derived by the program, which has authority over all', 'assets in the market.'],
            type: 'publicKey',
          },
          {
            name: 'owner',
            docs: ['The account that has authority to make changes to the market'],
            type: 'publicKey',
          },
          {
            name: 'quoteTokenMint',
            docs: ['The mint for the token used to quote the value for reserve assets.'],
            type: 'publicKey',
          },
          {
            name: 'nftSwitchboardPriceAggregator',
            docs: ['The account where a Pyth oracle keeps the updated price of the token.'],
            type: 'publicKey',
          },
          {
            name: 'nftCollectionCreator',
            docs: ['The mint for the token being held in this reserve'],
            type: 'publicKey',
          },
          {
            name: 'flags',
            docs: ['Storage for flags that can be set on the market.'],
            type: 'u64',
          },
          {
            name: 'marketOracleState',
            docs: ['oracle price data'],
            type: {
              array: ['u8', 24],
            },
          },
          {
            name: 'reserved',
            docs: ['Unused space before start of reserve list'],
            type: {
              array: ['u8', 352],
            },
          },
          {
            name: 'reserves',
            docs: ['The storage for information on reserves in the market'],
            type: {
              array: ['u8', 12288],
            },
          },
        ],
      },
    },
    {
      name: 'obligation',
      docs: ["Tracks information about a user's obligation to repay a borrowed position."],
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'version',
            type: 'u32',
          },
          {
            name: 'reserved0',
            type: 'u32',
          },
          {
            name: 'market',
            docs: ['The market this obligation is a part of'],
            type: 'publicKey',
          },
          {
            name: 'owner',
            docs: ['The address that owns the debt/assets as a part of this obligation'],
            type: 'publicKey',
          },
          {
            name: 'reserved1',
            docs: ['Unused space before start of collateral info'],
            type: {
              array: ['u8', 184],
            },
          },
          {
            name: 'collateralNftMint',
            docs: ['stores collateral nft key'],
            type: {
              array: ['publicKey', 11],
            },
          },
          {
            name: 'cached',
            docs: ['The storage for cached calculations'],
            type: {
              array: ['u8', 256],
            },
          },
          {
            name: 'loans',
            docs: ['The storage for the information on positions owed by this obligation'],
            type: {
              array: ['u8', 2048],
            },
          },
        ],
      },
    },
    {
      name: 'reserve',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'version',
            type: 'u16',
          },
          {
            name: 'index',
            docs: ['The unique id for this reserve within the market'],
            type: 'u16',
          },
          {
            name: 'exponent',
            docs: ['The base 10 decimals used for token values'],
            type: 'i32',
          },
          {
            name: 'market',
            docs: ['The market this reserve is a part of.'],
            type: 'publicKey',
          },
          {
            name: 'switchboardPriceAggregator',
            docs: ['The account where a Pyth oracle keeps the updated price of the token.'],
            type: 'publicKey',
          },
          {
            name: 'tokenMint',
            docs: ['The mint for the token being held in this reserve'],
            type: 'publicKey',
          },
          {
            name: 'depositNoteMint',
            docs: ["The mint for this reserve's deposit notes"],
            type: 'publicKey',
          },
          {
            name: 'loanNoteMint',
            docs: ["The mint for this reserve's loan notes"],
            type: 'publicKey',
          },
          {
            name: 'vault',
            docs: ["The account with custody over the reserve's tokens."],
            type: 'publicKey',
          },
          {
            name: 'feeNoteVault',
            docs: ['The account with custody of the notes generated from collected fees'],
            type: 'publicKey',
          },
          {
            name: 'protocolFeeNoteVault',
            docs: ['The account with custody of the notes generated from protocol collected fees'],
            type: 'publicKey',
          },
          {
            name: 'reserved0',
            type: {
              array: ['u8', 408],
            },
          },
          {
            name: 'config',
            type: {
              defined: 'ReserveConfig',
            },
          },
          {
            name: 'reserved1',
            type: {
              array: ['u8', 704],
            },
          },
          {
            name: 'state',
            type: {
              array: ['u8', 536],
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'Amount',
      docs: ['Represent an amount of some value (like tokens, or notes)'],
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'units',
            type: {
              defined: 'AmountUnits',
            },
          },
          {
            name: 'value',
            type: 'u64',
          },
        ],
      },
    },
    {
      name: 'BorrowBumpSeeds',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'loanAccount',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'ExecuteLiquidateBidBumps',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'bid',
            type: 'u8',
          },
          {
            name: 'bidEscrow',
            type: 'u8',
          },
          {
            name: 'bidEscrowAuthority',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'ExecuteLiquidatePNFTBidBumps',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'bid',
            type: 'u8',
          },
          {
            name: 'bidEscrow',
            type: 'u8',
          },
          {
            name: 'bidEscrowAuthority',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'IncreaseLiquidateBidBumps',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'bid',
            type: 'u8',
          },
          {
            name: 'bidEscrow',
            type: 'u8',
          },
          {
            name: 'bidEscrowAuthority',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'InitReserveBumpSeeds',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'vault',
            type: 'u8',
          },
          {
            name: 'feeNoteVault',
            type: 'u8',
          },
          {
            name: 'protocolFeeNoteVault',
            type: 'u8',
          },
          {
            name: 'depositNoteMint',
            type: 'u8',
          },
          {
            name: 'loanNoteMint',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'PlaceLiquidateBidBumps',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'bid',
            type: 'u8',
          },
          {
            name: 'bidEscrow',
            type: 'u8',
          },
          {
            name: 'bidEscrowAuthority',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'RevokeLiquidateBidBumps',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'bid',
            type: 'u8',
          },
          {
            name: 'bidEscrow',
            type: 'u8',
          },
          {
            name: 'bidEscrowAuthority',
            type: 'u8',
          },
        ],
      },
    },
    {
      name: 'AuthorizationDataLocal',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'payload',
            type: {
              vec: {
                defined: 'TaggedPayload',
              },
            },
          },
        ],
      },
    },
    {
      name: 'TaggedPayload',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'payload',
            type: {
              defined: 'PayloadTypeLocal',
            },
          },
        ],
      },
    },
    {
      name: 'SeedsVecLocal',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'seeds',
            docs: ['The vector of derivation seeds.'],
            type: {
              vec: 'bytes',
            },
          },
        ],
      },
    },
    {
      name: 'ProofInfoLocal',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'proof',
            docs: ['The merkle proof.'],
            type: {
              vec: {
                array: ['u8', 32],
              },
            },
          },
        ],
      },
    },
    {
      name: 'ReserveConfig',
      docs: [
        'We have three interest rate regimes. The rate is described by a continuous,',
        'piecewise-linear function of the utilization rate:',
        '1. zero to [utilization_rate_1]: borrow rate increases linearly from',
        '[borrow_rate_0] to [borrow_rate_1].',
        '2. [utilization_rate_1] to [utilization_rate_2]: borrow rate increases linearly',
        'from [borrow_rate_1] to [borrow_rate_2].',
        '3. [utilization_rate_2] to one: borrow rate increases linearly from',
        '[borrow_rate_2] to [borrow_rate_3].',
        '',
        'Interest rates are nominal annual amounts, compounded continuously with',
        'a day-count convention of actual-over-365. The accrual period is determined',
        'by counting slots, and comparing against the number of slots per year.',
      ],
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'utilizationRate1',
            docs: ['The utilization rate at which we switch from the first to second regime.'],
            type: 'u16',
          },
          {
            name: 'utilizationRate2',
            docs: ['The utilization rate at which we switch from the second to third regime.'],
            type: 'u16',
          },
          {
            name: 'borrowRate0',
            docs: [
              'The lowest borrow rate in the first regime. Essentially the minimum',
              'borrow rate possible for the reserve.',
            ],
            type: 'u16',
          },
          {
            name: 'borrowRate1',
            docs: ['The borrow rate at the transition point from the first to second regime.'],
            type: 'u16',
          },
          {
            name: 'borrowRate2',
            docs: ['The borrow rate at the transition point from the second to thirs regime.'],
            type: 'u16',
          },
          {
            name: 'borrowRate3',
            docs: [
              'The highest borrow rate in the third regime. Essentially the maximum',
              'borrow rate possible for the reserve.',
            ],
            type: 'u16',
          },
          {
            name: 'minCollateralRatio',
            docs: ['The minimum allowable collateralization ratio for an obligation'],
            type: 'u16',
          },
          {
            name: 'liquidationPremium',
            docs: ['The amount given as a bonus to a liquidator'],
            type: 'u16',
          },
          {
            name: 'manageFeeCollectionThreshold',
            docs: ['The threshold at which to collect the fees accumulated from interest into', 'real deposit notes.'],
            type: 'u64',
          },
          {
            name: 'manageFeeRate',
            docs: ['The fee rate applied to the interest payments collected'],
            type: 'u16',
          },
          {
            name: 'loanOriginationFee',
            docs: ['The fee rate applied as interest owed on new loans'],
            type: 'u16',
          },
          {
            name: 'reserved0',
            docs: [
              'Represented as a percentage of the Price',
              'confidence values above this will not be accepted',
              'The maximum token amount to allow in a single DEX trade when',
              'liquidating assetr from this reserve as collateral.',
              'unused',
            ],
            type: 'u16',
          },
          {
            name: 'reserved1',
            type: {
              array: ['u8', 24],
            },
          },
          {
            name: 'reserved2',
            type: {
              array: ['u8', 10],
            },
          },
        ],
      },
    },
    {
      name: 'AmountUnits',
      docs: ['Specifies the units of some amount of value'],
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Tokens',
          },
          {
            name: 'DepositNotes',
          },
          {
            name: 'LoanNotes',
          },
        ],
      },
    },
    {
      name: 'Rounding',
      docs: ['Specifies rounding integers up or down'],
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Up',
          },
          {
            name: 'Down',
          },
        ],
      },
    },
    {
      name: 'PayloadTypeLocal',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Pubkey',
            fields: ['publicKey'],
          },
          {
            name: 'Seeds',
            fields: [
              {
                defined: 'SeedsVecLocal',
              },
            ],
          },
          {
            name: 'MerkleProof',
            fields: [
              {
                defined: 'ProofInfoLocal',
              },
            ],
          },
          {
            name: 'Number',
            fields: ['u64'],
          },
        ],
      },
    },
    {
      name: 'CacheInvalidError',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Expired',
            fields: [
              {
                name: 'msg',
                type: 'string',
              },
            ],
          },
          {
            name: 'TooNew',
            fields: [
              {
                name: 'msg',
                type: 'string',
              },
            ],
          },
          {
            name: 'Invalidated',
          },
          {
            name: 'MathOverflow',
          },
        ],
      },
    },
    {
      name: 'Side',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Loan',
          },
        ],
      },
    },
    {
      name: 'JobCompletion',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Partial',
          },
          {
            name: 'Full',
          },
        ],
      },
    },
  ],
  events: [
    {
      name: 'BorrowEvent',
      fields: [
        {
          name: 'borrower',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'reserve',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'debt',
          type: 'u64',
          index: false,
        },
      ],
    },
    {
      name: 'DepositCollateralEvent',
      fields: [
        {
          name: 'depositor',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'market',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'amount',
          type: 'u64',
          index: false,
        },
      ],
    },
    {
      name: 'DepositCollateralEvent',
      fields: [
        {
          name: 'depositor',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'market',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'amount',
          type: 'u64',
          index: false,
        },
      ],
    },
    {
      name: 'ExecuteLiquidateEvent',
      fields: [
        {
          name: 'bid',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'owner',
          type: 'publicKey',
          index: false,
        },
      ],
    },
    {
      name: 'ExecuteLiquidateEvent',
      fields: [
        {
          name: 'bid',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'owner',
          type: 'publicKey',
          index: false,
        },
      ],
    },
    {
      name: 'IncreaseBidEvent',
      fields: [
        {
          name: 'bid',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'bidder',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'bidLimit',
          type: 'u64',
          index: false,
        },
        {
          name: 'bidIncrease',
          type: 'u64',
          index: false,
        },
      ],
    },
    {
      name: 'LiquidateSolventEvent',
      fields: [
        {
          name: 'owner',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'nftMint',
          type: 'publicKey',
          index: false,
        },
      ],
    },
    {
      name: 'PlaceBidEvent',
      fields: [
        {
          name: 'bid',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'bidder',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'bidLimit',
          type: 'u64',
          index: false,
        },
      ],
    },
    {
      name: 'RepayEvent',
      fields: [
        {
          name: 'borrower',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'reserve',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'amount',
          type: {
            defined: 'Amount',
          },
          index: false,
        },
      ],
    },
    {
      name: 'RevokeBidEvent',
      fields: [
        {
          name: 'bid',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'bidder',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'bidLimit',
          type: 'u64',
          index: false,
        },
      ],
    },
    {
      name: 'SolventWithdrawEvent',
      fields: [
        {
          name: 'withdrawer',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'market',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'amount',
          type: 'u64',
          index: false,
        },
      ],
    },
    {
      name: 'WithdrawCollateralEvent',
      fields: [
        {
          name: 'depositor',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'market',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'amount',
          type: 'u64',
          index: false,
        },
      ],
    },
    {
      name: 'SolventWithdrawEvent',
      fields: [
        {
          name: 'withdrawer',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'market',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'amount',
          type: 'u64',
          index: false,
        },
      ],
    },
    {
      name: 'WithdrawCollateralEvent',
      fields: [
        {
          name: 'depositor',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'market',
          type: 'publicKey',
          index: false,
        },
        {
          name: 'amount',
          type: 'u64',
          index: false,
        },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'MetadataError',
      msg: 'Metdata error',
    },
    {
      code: 6001,
      name: 'ArithmeticError',
      msg: 'failed to perform some math operation safely',
    },
    {
      code: 6002,
      name: 'VerifiedCreatorMismatch',
      msg: "verified creator doesn't match with the current market",
    },
    {
      code: 6003,
      name: 'InvalidOracle',
      msg: 'oracle account provided is not valid',
    },
    {
      code: 6004,
      name: 'NoFreeReserves',
      msg: 'no free space left to add a new reserve in the market',
    },
    {
      code: 6005,
      name: 'NoFreeObligation',
      msg: 'no free space left to add the new loan or collateral in an obligation',
    },
    {
      code: 6006,
      name: 'NftCollateralExists',
      msg: 'nft collateral position already exists',
    },
    {
      code: 6007,
      name: 'UnregisteredPosition',
      msg: "the obligation account doesn't have any record of the loan or collateral account",
    },
    {
      code: 6008,
      name: 'UnregisteredNFTPosition',
      msg: 'the nft collateral mint does not exist',
    },
    {
      code: 6009,
      name: 'InvalidOraclePrice',
      msg: 'the oracle price account has an invalid price value',
    },
    {
      code: 6010,
      name: 'InsufficientCollateral',
      msg: 'there is not enough collateral deposited to borrow against',
    },
    {
      code: 6011,
      name: 'SimultaneousDepositAndBorrow',
      msg: 'cannot both deposit collateral to and borrow from the same reserve',
    },
    {
      code: 6012,
      name: 'ObligationHealthy',
      msg: 'cannot liquidate a healthy position',
    },
    {
      code: 6013,
      name: 'ObligationUnhealthy',
      msg: 'cannot perform an action that would leave the obligation unhealthy',
    },
    {
      code: 6014,
      name: 'ExceptionalReserveState',
      msg: 'reserve requires special action; call refresh_reserve until up to date',
    },
    {
      code: 6015,
      name: 'InvalidAmountUnits',
      msg: 'the units provided in the amount are not valid for the instruction',
    },
    {
      code: 6016,
      name: 'InvalidDexMarketMints',
      msg: "the tokens in the DEX market don't match the reserve and lending market quote token",
    },
    {
      code: 6017,
      name: 'InvalidMarketAuthority',
      msg: "the market authority provided doesn't match the market account",
    },
    {
      code: 6018,
      name: 'InvalidLiquidationQuoteTokenAccount',
      msg: 'the quote token account provided cannot be used for liquidations',
    },
    {
      code: 6019,
      name: 'ObligationAccountMismatch',
      msg: "the obligation account doesn't have the collateral/loan registered",
    },
    {
      code: 6020,
      name: 'UnknownInstruction',
      msg: 'unknown instruction',
    },
    {
      code: 6021,
      name: 'Disallowed',
      msg: 'current conditions prevent an action from being performed',
    },
    {
      code: 6022,
      name: 'LiquidationSwapSlipped',
      msg: 'the actual slipped amount on the DEX trade exceeded the threshold configured',
    },
    {
      code: 6023,
      name: 'CollateralValueTooSmall',
      msg: 'the collateral value is too small for a DEX trade',
    },
    {
      code: 6024,
      name: 'LiquidationLowCollateral',
      msg: 'the collateral returned by the liquidation is smaller than requested',
    },
    {
      code: 6025,
      name: 'NotSupported',
      msg: 'this action is currently not supported by this version of the program',
    },
    {
      code: 6026,
      name: 'MarketHalted',
      msg: 'the market has currently halted this kind of operation',
    },
    {
      code: 6027,
      name: 'InvalidParameter',
      msg: 'a given parameter is not valid',
    },
    {
      code: 6028,
      name: 'PositionNotEmpty',
      msg: 'the obligation account still holds position in the loan or collateral account',
    },
    {
      code: 6029,
      name: 'ObligationPositionNotFound',
      msg: 'position not found in an obligation',
    },
    {
      code: 6030,
      name: 'AccountNotEmptyError',
      msg: 'the collateral/loan account is not empty',
    },
    {
      code: 6031,
      name: 'InvalidMetadata',
      msg: 'invalid metadata ',
    },
    {
      code: 6032,
      name: 'BidMintMismatch',
      msg: "the liquidation bid's token account doesn't match the reserve",
    },
    {
      code: 6033,
      name: 'InvalidAuthority',
      msg: 'Invalid authority given to place a bid',
    },
    {
      code: 6034,
      name: 'MathOverflow',
      msg: 'Math overflow error',
    },
    {
      code: 6035,
      name: 'AnotherLoanOutstanding',
      msg: 'Obligation only allows for one loan at a time',
    },
    {
      code: 6036,
      name: 'BadRuleset',
      msg: 'bad ruleset passed',
    },
    {
      code: 6037,
      name: 'BadMetadata',
      msg: 'bad metadata passed',
    },
  ],
};
