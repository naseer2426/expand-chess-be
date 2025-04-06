import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { GameStatus } from 'chessjs-expandable';

export enum GameType {
    OPEN = 'OPEN',
    PRIVATE = 'PRIVATE',
}

export const GameStatusNotStarted = 'NOT_STARTED'

// not started is only something I need to worry about in the backend so I am not adding it in the chessjs-expandable package
export type BackendGameStatus = GameStatus | 'NOT_STARTED' 

@Entity()
export class Game {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        nullable:true
    })
    whitePlayerId?: string; // could be user id for logged in user or devide id for non logged in user

    @Column({
        nullable:true
    })
    blackPlayerId?: string; // could be user id for logged in user or devide id for non logged in user

    @Column()
    gameType: GameType;

    @Column()
    gameStatus: BackendGameStatus;

    @Column()
    currentFen: string; // should contain everything to rebuild board state

    @Column()
    startTime: number

    @Column({
        type: 'jsonb',
    })
    extendConfig: ExtendConfig

    @Column({
        type: 'jsonb',
    })
    moveDetails:MoveDetail[]
}

export type MoveDetail = {
    move:string
    playedAtMs: number // unix timestamp of when game move was played
}

export type ExtendConfig ={
    horizontalAddUnit: {x:number, y:number}
    verticalAddUnit: {x:number, y:number}
    horizontalExtendLimit: number
    verticalExtendLimit: number
}
