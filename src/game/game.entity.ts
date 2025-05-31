import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import {
    GameType,
    BackendGameStatus,
    ExtendConfig,
    MoveDetail,
} from './game.types';

@Entity()
export class Game {
    @PrimaryGeneratedColumn('uuid')
    id?: string;

    @Column()
    creatorId: string;

    @Column()
    creatorColor: 'black' | 'white' | 'random';

    @Column({
        nullable: true, // could be null if player has not connected yet
    })
    whitePlayerId?: string; // could be user id for logged in user or devide id for non logged in user

    @Column({
        nullable: true, // could be null if player has not connected yet
    })
    blackPlayerId?: string; // could be user id for logged in user or devide id for non logged in user

    @Column()
    gameType: GameType;

    @Column()
    gameStatus: BackendGameStatus;

    @Column()
    currentFen: string; // should contain everything to rebuild board state

    @Column({
        type: 'bigint',
        nullable: true,
    })
    startTime?: number;

    @Column({
        type: 'jsonb',
    })
    extendConfig: ExtendConfig;

    @Column({
        type: 'jsonb',
    })
    moveDetails: MoveDetail[];
}
