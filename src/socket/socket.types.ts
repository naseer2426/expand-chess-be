import { BackendGameStatus, ExtendConfig } from "src/game/game.types"

export const EVENT_JOIN_GAME = "joinGame"
export const EVENT_JOIN_GAME_RESP = "joinGameResp"
export const EVENT_MOVE = "move"

export type JoinGame = {
    gameId: string
    clientId: string
}

export type GameState = {
    fen:string
    gameStatus: BackendGameStatus
    extendConfig:ExtendConfig
    // TODO: extend for clock state later
}

export type JoinGameResp = {
    error:string
    gameState:null
} | {
    error:null
    gameState: GameState
}

export type Move = {
    move:string
    gameId:string
}
