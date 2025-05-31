import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
    EVENT_JOIN_GAME,
    EVENT_SYNC_MOVE,
    EVENT_SYNC_GAME,
    JoinGame,
    SyncMove,
    SyncGame,
} from './socket.types';
import { GameService } from 'src/game/game.service';
import { GameStatusNotStarted } from 'src/game/game.types';
import { GameStatus } from 'chessjs-expandable';

@Injectable()
export class SocketService {
    constructor(private readonly gameService: GameService) {}

    handleConnection(socket: Socket): void {
        const clientId = socket.id;

        console.log('Client connected:', clientId);

        socket.on(EVENT_JOIN_GAME, async (req: JoinGame) => {
            const resp = await this.joinGameCallback(req);
            if (resp.error) {
                socket.emit(EVENT_SYNC_GAME, resp);
                return;
            }

            socket.join(req.gameId);

            if (this.gameService.needToStart(resp.game)) {
                const startResp = await this.gameService.startGame(req.gameId);
                if (startResp.error) {
                    socket.broadcast.to(req.gameId).emit(EVENT_SYNC_GAME, {
                        error: `failed to start game: ${startResp.error}`,
                    });
                    socket.emit(EVENT_SYNC_GAME, {
                        error: `failed to start game: ${startResp.error}`,
                    });
                    return;
                }
                resp.game = startResp.game;
                socket.broadcast.to(req.gameId).emit(EVENT_SYNC_GAME, resp);
            }
            socket.emit(EVENT_SYNC_GAME, resp);
        });

        socket.on('disconnect', () => {});

        socket.on(EVENT_SYNC_MOVE, async (syncMove: SyncMove) => {
            const resp = await this.gameService.move(
                syncMove.gameId,
                syncMove.move,
                syncMove.moveNumber,
            );
            if (resp.error != null) {
                socket.broadcast.to(syncMove.gameId).emit(EVENT_SYNC_GAME, {
                    error: `move failure: ${resp.error}`,
                });
                socket.emit(EVENT_SYNC_GAME, {
                    error: `move failure: ${resp.error}`,
                });
                return;
            }
            const syncGame: SyncGame = {
                game: resp.game,
                error: null,
            };
            socket.broadcast
                .to(syncMove.gameId)
                .emit(EVENT_SYNC_GAME, syncGame);
            if (resp.game.gameStatus != GameStatus.IN_PROGRESS) {
                socket.emit(EVENT_SYNC_GAME, syncGame);
            }
        });
    }

    async joinGameCallback(req: JoinGame): Promise<SyncGame> {
        const resp = await this.gameService.getGame(req.gameId);
        if (resp.error) {
            return { error: resp.error, game: null };
        }
        if (
            resp.game.gameStatus != GameStatusNotStarted &&
            resp.game.gameStatus != GameStatus.IN_PROGRESS
        ) {
            return {
                error: null,
                game: resp.game,
            };
        }
        const { game: updatedGame, isUpdated } =
            this.gameService.assignOpponentColor(req.clientId, resp.game);
        if (isUpdated) {
            const saveResp = await this.gameService.save(updatedGame);
            if (saveResp.error) {
                return { error: `failed to update game state`, game: null };
            }
        }
        return {
            error: null,
            game: updatedGame,
        };
    }
}
