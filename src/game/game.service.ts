import { Injectable,Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository} from "typeorm";
import { Game} from "./game.entity";
import {ExtendConfig, GameType, GameStatusNotStarted} from "./game.types"
import { tryCatch } from "src/utils/try-catch";
import { Chess, GameStatus } from "chessjs-expandable";

const startingFen = "#rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

@Injectable()
export class GameService {
    private readonly logger = new Logger(GameService.name);

    constructor(
        @InjectRepository(Game)
        private readonly gameRepository: Repository<Game>,
    ) { }

    async createOpenGame(
        creatorId:string, randomColor: boolean, 
        extendConfig: ExtendConfig,fixedColor?: "black"|"white",
    ): Promise<{id:string|null, error:string|null}> {

        const game: Game = {
            gameType:GameType.OPEN,
            gameStatus:GameStatusNotStarted,
            creatorId,
            creatorColor: randomColor?"random":fixedColor,
            currentFen:startingFen,
            extendConfig:extendConfig,
            moveDetails:[],
        }

        
        const result = await tryCatch(this.gameRepository.save(game))
        if (result.error) {
            return {id:null, error:result.error.message}
        }
        return {id:result.data.id, error:null}
    }

    async save(game:Game):Promise<{error?:string,game?:Game}> {
        return await tryCatch(this.gameRepository.save(game))
    }

    async move(gameId: string, move:string, moveNumber:number):Promise<{error:string|null,gameStatus?:GameStatus}> {
        const game = await tryCatch(this.gameRepository.findOneBy({id:gameId}))
        if (game.error) {
            return {error:game.error.message}
        }
        if (game.data.gameStatus !== GameStatus.IN_PROGRESS) {
            return {error:"game not in progress"}
        }
        if (game.data.moveDetails.length+1 !== moveNumber) {
            this.logger.debug(`move number ${moveNumber} recieved for game ${gameId} but move number is ${game.data.moveDetails.length+1}`)
            // not returning error since this can happen when the retry request from client is recieved after the game has progressed, we can safely ignore this
            return {error:null,gameStatus:game.data.gameStatus}
        }
        const chess = new Chess(
            game.data.currentFen,
            game.data.extendConfig.horizontalExtendLimit,
            game.data.extendConfig.verticalExtendLimit,
            game.data.extendConfig.horizontalAddUnit,
            game.data.extendConfig.verticalAddUnit
        )
        const valid = chess.moveFromNotation(move)
        if (!valid) {
            this.logger.debug(`move ${move} is not valid for game ${gameId}`)
            return {error:"invalid move"}
        }
        const updatedGame:Game = {
            ...game.data,
            currentFen:chess.getCurrentFen(),
            moveDetails:[
                ...game.data.moveDetails,
                {
                    move:move,
                    playedAtMs:Date.now()
                }
            ],
            gameStatus:chess.getGameStatus()
        }
        
        const result = await tryCatch(this.gameRepository.save(updatedGame))
        if (result.error) {
            return {error:result.error.message}
        }
        return {error:null,gameStatus:chess.getGameStatus()}
    }
    async startGame(gameId:string):Promise<{error:string|null, game:Game|null}> {
        const game = await tryCatch(this.gameRepository.findOneBy({id:gameId}))
        if (game.error) {
            return {error:game.error.message, game:null}
        }
        if (game.data.gameStatus !== GameStatusNotStarted) {
            return {error:"game not in not started state", game:null}
        }
        const result = await tryCatch(this.gameRepository.update(gameId, {
            gameStatus:GameStatus.IN_PROGRESS,
            startTime:Date.now(),
        }))
        if (result.error) {
            return {error:result.error.message, game:null}
        }
        return {error:null, game:{...game.data, gameStatus:GameStatus.IN_PROGRESS}}
    }
    async joinOpenGame(gameId:string, playerId:string):Promise<{error:string|null}> {
        const game = await tryCatch(this.gameRepository.findOneBy({id:gameId}))
        if (game.error) {
            return {error:game.error.message}
        }
        if (game.data.gameStatus !== GameStatusNotStarted) {
            return {error:"game not in not started state"}
        }
        if (game.data.whitePlayerId) {
            game.data.blackPlayerId = playerId
        } else {
            game.data.whitePlayerId = playerId
        }
        const result = await tryCatch(this.gameRepository.save(game.data))
        if (result.error) {
            return {error:result.error.message}
        }
        return {error:null}
    }
    async getGame(gameId:string):Promise<{error:string|null, game:Game|null}> {
        const game = await tryCatch(this.gameRepository.findOneBy({id:gameId}))
        if (game.error) {
            return {error:game.error.message, game:null}
        }
        if (!game.data) {
            return {error:"game not found", game:null}
        }
        return {error:null, game:game.data}
    }

    assignColor(playerId:string, game:Game):Game {
        // opponent color already assigned
        if (game.whitePlayerId) {
            game.blackPlayerId = playerId
            return game
        }
        if (game.blackPlayerId) {
            game.whitePlayerId = playerId
            return game
        }
        // first assign
        if (game.creatorColor == "white") {
            if (playerId == game.creatorColor) {
                game.whitePlayerId = playerId
            } else {
                game.blackPlayerId = playerId
            }
            return game
        }
        if (game.creatorColor == "black") {
            if (playerId == game.creatorColor) {
                game.blackPlayerId = playerId
            } else {
                game.whitePlayerId = playerId
            }
            return game
        }
        if (Math.random() < 0.5) {
            game.whitePlayerId = playerId
            return game
        } 
        game.blackPlayerId = playerId
        return game
    }

    readyToStart(game:Game):boolean {
        if (game.whitePlayerId && game.blackPlayerId) {
            return true
        }
        return false
    }
}
