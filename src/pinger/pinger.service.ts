import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

// this service is purely ment to self ping so render does not sleep
@Injectable()
export class PingerService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {}
    @Cron('0 */14 * * * *') // Every 14 minutes
    async ping() {
        const selfPingUrl = this.configService.get<string>('SELF_PING_URL');
        if (!selfPingUrl) {
            return;
        }
        this.httpService.get(selfPingUrl).subscribe((resp)=>{console.log(resp.data)});
    }
}
