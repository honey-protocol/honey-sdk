import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import {  HoneyClient, HoneyUser, ObligationPositionStruct, PositionInfoList } from '..';
import { useHoney } from '../contexts/honey';
import { ConnectedWallet } from '../helpers/walletType';
import { useMarket } from './useMarket';
import * as anchor from '@project-serum/anchor';
import { BN } from '@project-serum/anchor';
import { parseObligationAccount } from '../helpers/programUtil'

export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export interface NftPosition {
    debt: number;
    address: PublicKey;
    ltv: number;
    is_healthy: boolean;
    highest_bid: number;
  }

export const useAllPositions = (
    connection: Connection,
    wallet: ConnectedWallet,
    honeyId: string,
    honeyMarketId: string,
) => {
    const [status, setStatus] = useState<{
        loading: boolean;
        positions?: NftPosition[];
        error?: Error;
      }>({ loading: false });

    const { honeyUser, honeyReserves, honeyMarket } = useMarket(connection, wallet, honeyId, honeyMarketId);
    const { marketReserveInfo }  = useHoney();

    const fetchPositions = async() => {
        console.log('fetching bids...');
        const resBids = await fetch('https://honey-nft-api.herokuapp.com/bids', {mode:'cors'});
        const bids = await resBids.json();

        const highestBid = Math.max.apply(Math, bids.map(function(o) { return JSON.parse(o).bidLimit; }))
        console.log('fetching positions...');
        const provider = new anchor.Provider(connection, wallet, anchor.Provider.defaultOptions());
        const client: HoneyClient = await HoneyClient.connect(provider, honeyId, true);
        let arrPositions: NftPosition[] = [];

        let obligations = await client.program.account.obligation?.all();
        if (obligations && marketReserveInfo) {

          await Promise.all(obligations.map(async (item) => {
            let nftMints:PublicKey[] = item.account.collateralNftMint;

            const parsePosition = (position: any) => {
                const pos: ObligationPositionStruct = {
                    account: new PublicKey(position.account),
                    amount: new BN(position.amount),
                    side: position.side,
                    reserveIndex: position.reserveIndex,
                    _reserved: [],
                };
                return pos;
            };

            item.account.collateral = PositionInfoList.decode(Buffer.from(item.account.collateral as any as number[])).map(
                parsePosition,
            );
            item.account.loans = PositionInfoList.decode(Buffer.from(item.account.loans as any as number[])).map(parsePosition);

            await Promise.all(nftMints.map(async (nft) => {
              if(nft.toString() != '11111111111111111111111111111111') {

                const totalDebt = marketReserveInfo[0].loanNoteExchangeRate
                    .mul(item.account?.loans[0]?.amount)
                    .div(new BN(10 ** 15))
                    .div(new BN(10 ** 6))//!!
                    .div(new BN(10 ** 5)).toNumber() / (10 ** 4);//dividing lamport
                let position: NftPosition = {
                    debt: totalDebt,
                    address: new PublicKey(nft),
                    ltv: 60,
                    is_healthy: false,
                    highest_bid: highestBid
                };
                console.log('nft.toString()', nft.toString());
                arrPositions.push(position);
              }
            }));
          }));
          setStatus({loading: false, positions: arrPositions});
        }
    }

    // build nft positions
    useEffect(() => {
        if (!honeyUser) {
            setStatus({ loading: false, error: new Error('HoneyUser is undefined') });
            return;
        }
        fetchPositions();
    }, [honeyUser, marketReserveInfo]);
    return { ...status };
}