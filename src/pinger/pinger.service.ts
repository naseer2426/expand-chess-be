import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

// this service is purely ment to self ping so render does not sleep
@Injectable()
export class PingerService {
    private readonly logger = new Logger(PingerService.name);
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
        this.httpService.get(selfPingUrl).subscribe((resp)=>{this.logger.debug(resp.data)});
    }
}
