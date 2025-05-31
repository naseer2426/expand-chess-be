import { Game } from 'src/game/game.entity';

export const EVENT_JOIN_GAME = 'joinGame';
export const EVENT_SYNC_MOVE = 'syncMove';
export const EVENT_SYNC_GAME = 'syncGame';

export type JoinGame = {
    gameId: string;
    clientId: string;
};

export type SyncGame =
    | {
          error: string;
          game: null;
      }
    | {
          error: null;
          game: Game;
      };

export type SyncMove = {
    move: string;
    gameId: string;
    moveNumber: number;
};
