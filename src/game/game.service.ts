import { Injectable,Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository} from "typeorm";
import { Game, ExtendConfig, GameType, GameStatusNotStarted} from "./game.entity";
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
        creatorId:string, 
        creatorColor: {randomColor: boolean, fixedColor?: "black"|"white"},
        extendConfig: ExtendConfig
    ): Promise<{id:string|null, error:string|null}> {
        const game: Game = {
            id:"",
            gameType:GameType.OPEN,
            gameStatus:GameStatusNotStarted,
            currentFen:startingFen,
            startTime:Date.now(),
            extendConfig:extendConfig,
            moveDetails:[]
        }

        const color = creatorColor.randomColor ? (Math.random() < 0.5 ? "black" : "white") : creatorColor.fixedColor!
        if (color === "black") {
            game.blackPlayerId = creatorId
        }
        else {
            game.whitePlayerId = creatorId
        }
        const result = await tryCatch(this.gameRepository.save(game))
        if (result.error) {
            return {id:null, error:result.error.message}
        }
        return {id:result.data.id, error:null}
    }
    
    async createPrivateGame(
        creatorId: string,
        opponentId: string,
        creatorColor: {randomColor: boolean, fixedColor?: "black"|"white"},
        extendConfig: ExtendConfig
    ): Promise<{id:string|null, error:string|null}> {
        const game: Game = {
            id:"",
            gameType:GameType.OPEN,
            gameStatus:GameStatusNotStarted,
            currentFen:startingFen,
            startTime:Date.now(),
            extendConfig:extendConfig,
            moveDetails:[]
        }

        const color = creatorColor.randomColor ? (Math.random() < 0.5 ? "black" : "white") : creatorColor.fixedColor!
        if (color === "black") {
            game.blackPlayerId = creatorId
            game.whitePlayerId = opponentId
        }
        else {
            game.whitePlayerId = creatorId
            game.blackPlayerId = opponentId
        }       

        const result = await tryCatch(this.gameRepository.save(game))
        if (result.error) {
            return {id:null, error:result.error.message}
        }
        return {id:result.data.id, error:null}
    }

    async move(gameId: string, move:string, moveNumber:number):Promise<{error:string|null}> {
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
            return {error:null}
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
        return {error:null}
    }
    async startGame(gameId:string):Promise<{error:string|null, game:Game|null}> {
        const game = await tryCatch(this.gameRepository.findOneBy({id:gameId}))
        if (game.error) {
            return {error:game.error.message, game:null}
        }
        if (game.data.gameStatus !== GameStatusNotStarted) {
            return {error:"game not in not started state", game:null}
        }
        const result = await tryCatch(this.gameRepository.update(gameId, {gameStatus:GameStatus.IN_PROGRESS}))
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
        return {error:null, game:game.data}
    }
}
