import { TxnResponse } from '../helpers/JetTypes';
export declare type TxResponse = [res: TxnResponse, txid: string[]];
export declare type ResultSuccess<T> = {
    type: 'success';
    value: T;
};
export declare type ResultError = {
    type: 'error';
    error: Error;
};
export declare type Result<T> = ResultSuccess<T> | ResultError;
export declare function makeError(error: Error): ResultError;
export declare function makeSuccess<T>(t: T): ResultSuccess<T>;
