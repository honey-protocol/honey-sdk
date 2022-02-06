import { TxnResponse } from "../helpers/JetTypes"


// Onchain Error Handling
export type ResultSuccess<T> = { type: 'success'; value: T }
export type ResultError = { type: 'error'; error: Error }
export type Result<T> = ResultSuccess<T> | ResultError

export type TxResponse = [res: TxnResponse, txid: string[]]


export interface ObligationDoesNotExistError extends Error {
}

export interface ObligationDoesNotExistErrorConstructor extends ErrorConstructor {
    new(message?: string): ReferenceError;
    (message?: string): ReferenceError;
    readonly prototype: ReferenceError;
}

export declare var ObligationDoesNotExistError: ObligationDoesNotExistErrorConstructor;

export function makeError(error: Error): ResultError {
    return { type: 'error', error: error }
}

export function makeSuccess<T>(t: T): ResultSuccess<T> {
    return { type: 'success', value: t }
}