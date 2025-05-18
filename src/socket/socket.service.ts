import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { EVENT_JOIN_GAME, EVENT_JOIN_GAME_RESP, JoinGame, JoinGameResp, Move } from './socket.types';
import { GameService } from 'src/game/game.service';
import { GameStatusNotStarted } from 'src/game/game.types';
import { GameStatus } from 'chessjs-expandable';

@Injectable()
export class SocketService {
  constructor(
    private readonly gameService: GameService
  ) {}

  handleConnection(socket: Socket): void {
    const clientId = socket.id;

    console.log('Client connected:', clientId);

    socket.on(EVENT_JOIN_GAME,async (req: JoinGame)=>{
      const resp = await this.joinGameCallback(req)
      if (resp.error) {
        socket.emit(EVENT_JOIN_GAME_RESP,resp)
        return
      }
      socket.join(req.gameId)
      socket.emit(EVENT_JOIN_GAME_RESP,resp)
    }) 

    socket.on('disconnect', () => {
    });

    socket.on('move', (move: Move) => {
      socket.to(move.gameId).emit('move', move);
    });
  }

  async joinGameCallback(req: JoinGame): Promise<JoinGameResp> {
    const resp = await this.gameService.getGame(req.gameId)
    if (resp.error) {
      return {error:resp.error, gameState:null}
    }
    let game = resp.game
    if (game.gameStatus != GameStatusNotStarted && game.gameStatus != GameStatus.IN_PROGRESS) {
      return {error:`invalid game status: game status: ${game.gameStatus}`, gameState:null}
    }
    game = this.gameService.assignColor(req.clientId,game)
    if (this.gameService.readyToStart(game)) {
      // handle start game
    }
    const saveResp =  await this.gameService.save(game)
    if (saveResp.error) {
      return {error:`failed to update game state`, gameState:null}
    }
    return {
      error:null, 
      gameState:{
        fen:game.currentFen,
        gameStatus: game.gameStatus,
        extendConfig:game.extendConfig
      }
    }
  }
}
