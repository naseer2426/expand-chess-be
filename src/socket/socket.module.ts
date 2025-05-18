import { Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { SocketGateway } from './socket.gateway';
import { GameModule } from 'src/game/game.module';

@Module({
  imports:[GameModule],
  providers: [SocketService, SocketGateway],
  exports: [SocketService],
})
export class SocketModule {}
