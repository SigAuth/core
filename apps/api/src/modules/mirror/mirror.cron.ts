import { PrismaService } from '@/common/prisma/prisma.service';
import { MirrorService } from '@/modules/mirror/mirror.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Mirror } from '@sigauth/generics/prisma-client';

@Injectable()
export class MirrorCronService {
    private readonly logger: Logger = new Logger(MirrorCronService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mirrorService: MirrorService,
    ) {}

    @Cron('* * * * *') // Runs every minute
    async tick() {
        const mirrors = await this.prisma.mirror.findMany({ where: { autoRun: true, NOT: { autoRunInterval: null } } });

        const now = Date.now();
        for (const mirror of mirrors) {
            const msPassed = now - (mirror.lastRun?.getTime() ?? 0);
            if (msPassed >= mirror.autoRunInterval! * 60 * 1000) {
                // Execute mirror logic here
                this.logger.log(`Executing mirror ${mirror.name} (ID: ${mirror.id})`);
                const res = await this.mirrorService.runMirrorCode('run', mirror.id, (msg: string) => {
                    this.logger.debug(`Mirror ${mirror.name} says: ${msg}`);
                });

                if (res != 'OK') this.logger.warn(`Mirror ${mirror.name} execution returned unexpected result: ${res}`);
            }
        }
    }
}
