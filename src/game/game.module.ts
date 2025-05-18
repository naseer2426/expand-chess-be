import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { Game } from './game.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [TypeOrmModule.forFeature([
        Game
    ])],
    providers:[GameService],
    controllers:[GameController],
    exports: [GameService]
})
export class GameModule {}
