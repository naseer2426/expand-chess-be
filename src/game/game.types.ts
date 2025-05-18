import { GameStatus } from 'chessjs-expandable';

export enum GameType {
    OPEN = 'OPEN',
    PRIVATE = 'PRIVATE',
}

export const GameStatusNotStarted = 'NOT_STARTED'

// not started is only something I need to worry about in the backend so I am not adding it in the chessjs-expandable package
export type BackendGameStatus = GameStatus | 'NOT_STARTED'

export type MoveDetail = {
    move:string
    playedAtMs: number // unix timestamp of when game move was played
}

export type ExtendConfig ={
    horizontalAddUnit: {x:number, y:number}
    verticalAddUnit: {x:number, y:number}
    horizontalExtendLimit: number
    verticalExtendLimit: number
}

export type CreateGameRequest = {
    creatorId:string
    randomColor:boolean
    color?:"black"|"white"
    extendConfig:ExtendConfig
}
export type GetGameRequest = {
    gameId:string
}

export type StartGameRequest = {
    gameId:string
}

export type MoveRequest = {
    gameId:string
    move:string,
    moveNumber:number
}

export type JoinGame = {
    gameId:string
    clientId:string,
}
