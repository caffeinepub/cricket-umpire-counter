import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface MatchState {
    overs: bigint;
    runs: bigint;
    wickets: bigint;
    balls: bigint;
}
export interface backendInterface {
    getSavedMatchState(): Promise<MatchState>;
    saveMatchState(runs: bigint, wickets: bigint, overs: bigint, balls: bigint): Promise<void>;
}
