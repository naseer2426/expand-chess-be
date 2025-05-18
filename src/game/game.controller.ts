import { Controller, Get, Post, Body,Query, Put } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameRequest, GetGameRequest, JoinGame, MoveRequest, StartGameRequest } from './game.types';
import { Game } from './game.entity';
import { ConfigService } from '@nestjs/config';
import { GameStatus } from 'chessjs-expandable';

@Controller('game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly configService: ConfigService
) {}

  @Post()
  async createGame(@Body() req: CreateGameRequest):Promise<{id:string|null, error:string|null}> {
    const env = this.configService.get<string>('NODE_ENV');
    if (env == "production") {
        return {
            id:null,
            error:"APIs not accessible in production"
        }
    }
    return await this.gameService.createOpenGame(
        req.creatorId,
        req.randomColor,
        req.extendConfig,
        req.color
    )
  }
  @Get()
  async getGame(@Query() query: GetGameRequest):Promise<{error:string|null, game:Game|null}> {
    const env = this.configService.get<string>('NODE_ENV');
    if (env == "production") {
        return {
            game:null,
            error:"APIs not accessible in production"
        }
    }
    return await this.gameService.getGame(query.gameId)
  }
  @Put()
  async move(@Body() req: MoveRequest):Promise<{error:string|null,gameStatus?:GameStatus}> {
    const env = this.configService.get<string>('NODE_ENV');
    if (env == "production") {
        return {
            error:"APIs not accessible in production"
        }
    }
    return await this.gameService.move(req.gameId,req.move,req.moveNumber)
  }
  @Put('join')
  async join(@Body() req: JoinGame):Promise<{error:string|null}> {
    const env = this.configService.get<string>('NODE_ENV');
    if (env == "production") {
        return {
            error:"APIs not accessible in production"
        }
    }
    return await this.gameService.joinOpenGame(req.gameId,req.clientId)
  }
  @Put('start')
  async start(@Body() req: StartGameRequest):Promise<{error:string|null}> {
    return await this.gameService.startGame(req.gameId)
  }
}
