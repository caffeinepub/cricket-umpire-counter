import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface Match {
    team1: Team;
    team2: Team;
    overs: bigint;
    date: Time;
    balls: bigint;
}
export interface Team {
    name: string;
    score: bigint;
}
export interface backendInterface {
    getAllMatches(): Promise<Array<Match>>;
    saveMatch(team1Name: string, team1Score: bigint, team2Name: string, team2Score: bigint, overs: bigint, balls: bigint): Promise<void>;
}
