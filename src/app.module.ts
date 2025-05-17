import { Module } from '@nestjs/common';
import { SocketModule } from './socket/socket.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './game/game.entity';
import { PingerModule } from './pinger/pinger.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:true,
    }), 
    SocketModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRESS_HOST,
      port: parseInt(process.env.POSTGRES_PORT, 10),
      username: process.env.POSTGRESS_USER,
      password: process.env.POSTGRESS_PASSWORD,
      database: process.env.POSTGRESS_DB,
      entities: [Game],
      synchronize: true,
    }),
    PingerModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
