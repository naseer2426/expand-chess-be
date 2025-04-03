import { Module } from '@nestjs/common';
import { SocketModule } from './socket/socket.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({}), 
    SocketModule,
  ],
})
export class AppModule {}
