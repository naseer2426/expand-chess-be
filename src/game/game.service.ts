import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './game.entity';
import { ExtendConfig, GameType, GameStatusNotStarted } from './game.types';
import { tryCatch } from 'src/utils/try-catch';
import { Chess, GameStatus } from 'chessjs-expandable';
import { SyncGame } from 'src/socket/socket.types';

const startingFen = '#rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

@Injectable()
export class GameService {
    private readonly logger = new Logger(GameService.name);

    constructor(
        @InjectRepository(Game)
        private readonly gameRepository: Repository<Game>,
    ) {}

    async createOpenGame(
        creatorId: string,
        randomColor: boolean,
        extendConfig: ExtendConfig,
        fixedColor?: 'black' | 'white',
    ): Promise<{ id: string | null; error: string | null }> {
        let game: Game = {
            gameType: GameType.OPEN,
            gameStatus: GameStatusNotStarted,
            creatorId,
            creatorColor: randomColor ? 'random' : fixedColor,
            currentFen: startingFen,
            extendConfig: extendConfig,
            moveDetails: [],
        };
        game = this.assignCreatorColor(creatorId, game);

        const result = await tryCatch(this.gameRepository.save(game));
        if (result.error) {
            return { id: null, error: result.error.message };
        }
        return { id: result.data.id, error: null };
    }

    async save(game: Game): Promise<{ error?: string; game?: Game }> {
        return await tryCatch(this.gameRepository.save(game));
    }

    async move(
        gameId: string,
        move: string,
        moveNumber: number,
    ): Promise<{ error: string; game: null } | { error: null; game: Game }> {
        const resp = await tryCatch(
            this.gameRepository.findOneBy({ id: gameId }),
        );
        if (resp.error) {
            return { error: resp.error.message, game: null };
        }
        if (resp.data.gameStatus !== GameStatus.IN_PROGRESS) {
            return { error: 'game not in progress', game: null };
        }
        if (resp.data.moveDetails.length + 1 !== moveNumber) {
            this.logger.debug(
                `move number ${moveNumber} recieved for game ${gameId} but move number is ${resp.data.moveDetails.length + 1}`,
            );
            // not returning error since this can happen when the retry request from client is recieved after the game has progressed, we can safely ignore this
            return { error: null, game: resp.data };
        }
        const chess = new Chess(
            resp.data.currentFen,
            resp.data.extendConfig.horizontalExtendLimit,
            resp.data.extendConfig.verticalExtendLimit,
            resp.data.extendConfig.horizontalAddUnit,
            resp.data.extendConfig.verticalAddUnit,
        );
        const valid = chess.moveFromNotation(move);
        if (!valid) {
            this.logger.debug(`move ${move} is not valid for game ${gameId}`);
            return { error: 'invalid move', game: null };
        }
        const updatedGame: Game = {
            ...resp.data,
            currentFen: chess.getCurrentFen(),
            moveDetails: [
                ...resp.data.moveDetails,
                {
                    move: move,
                    playedAtMs: Date.now(),
                },
            ],
            gameStatus: chess.getGameStatus(),
        };

        const result = await tryCatch(this.gameRepository.save(updatedGame));
        if (result.error) {
            return { error: result.error.message, game: null };
        }
        return { error: null, game: updatedGame };
    }
    async startGame(gameId: string): Promise<SyncGame> {
        const game = await tryCatch(
            this.gameRepository.findOneBy({ id: gameId }),
        );
        if (game.error) {
            return { error: game.error.message, game: null };
        }
        if (game.data.gameStatus !== GameStatusNotStarted) {
            return { error: 'game not in not started state', game: null };
        }
        const startTime = Date.now();
        const result = await tryCatch(
            this.gameRepository.update(gameId, {
                gameStatus: GameStatus.IN_PROGRESS,
                startTime,
            }),
        );
        if (result.error) {
            return { error: result.error.message, game: null };
        }
        return {
            error: null,
            game: {
                ...game.data,
                gameStatus: GameStatus.IN_PROGRESS,
                startTime,
            },
        };
    }
    async joinOpenGame(
        gameId: string,
        playerId: string,
    ): Promise<{ error: string | null }> {
        const game = await tryCatch(
            this.gameRepository.findOneBy({ id: gameId }),
        );
        if (game.error) {
            return { error: game.error.message };
        }
        if (game.data.gameStatus !== GameStatusNotStarted) {
            return { error: 'game not in not started state' };
        }
        if (game.data.whitePlayerId) {
            game.data.blackPlayerId = playerId;
        } else {
            game.data.whitePlayerId = playerId;
        }
        const result = await tryCatch(this.gameRepository.save(game.data));
        if (result.error) {
            return { error: result.error.message };
        }
        return { error: null };
    }
    async getGame(
        gameId: string,
    ): Promise<{ error: string | null; game: Game | null }> {
        const game = await tryCatch(
            this.gameRepository.findOneBy({ id: gameId }),
        );
        if (game.error) {
            return { error: game.error.message, game: null };
        }
        if (!game.data) {
            return { error: 'game not found', game: null };
        }
        return { error: null, game: game.data };
    }

    /* 
        this function is meant to be called for a game whose creator color
        has already been assigned. As of writing this comment, createOpenGame
        assigns the creator color when the game is created.
    */
    assignOpponentColor(
        opponentId: string,
        game: Game,
    ): { game: Game; isUpdated: boolean } {
        if (opponentId == game.creatorId) {
            return { game, isUpdated: false };
        }
        if (game.blackPlayerId && game.whitePlayerId) {
            return { game, isUpdated: false };
        }
        if (game.blackPlayerId) {
            game.whitePlayerId = opponentId;
            return { game, isUpdated: true };
        }
        game.blackPlayerId = opponentId;
        return { game, isUpdated: true };
    }

    assignCreatorColor(creatorId: string, game: Game): Game {
        if (creatorId != game.creatorId) {
            return game;
        }
        if (game.creatorColor == 'white') {
            game.whitePlayerId = creatorId;
            return game;
        }
        if (game.creatorColor == 'black') {
            game.blackPlayerId = creatorId;
            return game;
        }
        //random color
        if (Math.random() < 0.5) {
            game.whitePlayerId = creatorId;
            return game;
        }
        game.blackPlayerId = creatorId;
        return game;
    }

    needToStart(game: Game): boolean {
        if (game.gameStatus != GameStatusNotStarted) {
            return false;
        }
        if (game.whitePlayerId && game.blackPlayerId) {
            return true;
        }
        return false;
    }
}
