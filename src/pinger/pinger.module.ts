import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PingerService } from './pinger.service';

@Module({
    imports:[HttpModule],
    providers:[PingerService]
})
export class PingerModule {}
