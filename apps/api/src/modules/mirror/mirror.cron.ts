import { PrismaService } from '@/common/prisma/prisma.service';
import { MirrorService } from '@/modules/mirror/mirror.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Mirror } from '@sigauth/generics/prisma-client';

@Injectable()
export class MirrorCronService {
    private readonly logger: Logger = new Logger(MirrorCronService.name);
    private readonly runningMirrors: Set<number> = new Set();

    constructor(
        private readonly prisma: PrismaService,
        private readonly mirrorService: MirrorService,
    ) {}

    @Cron('* * * * *') // Runs every minute
    async tick() {
        const mirrors = await this.prisma.mirror.findMany({ where: { autoRun: true, NOT: { autoRunInterval: null } } });

        const now = Date.now();
        for (const mirror of mirrors) {
            // Skip if this mirror is already running
            if (this.runningMirrors.has(mirror.id)) {
                continue;
            }

            const msPassed = now - (mirror.lastRun?.getTime() ?? 0);
            if (msPassed >= mirror.autoRunInterval! * 60 * 1000) {
                // Mark mirror as running in memory
                this.runningMirrors.add(mirror.id);

                // Execute asynchronously to not block other mirrors
                this.executeMirror(mirror).finally(() => {
                    // Remove from running set when done
                    this.runningMirrors.delete(mirror.id);
                });
            }
        }
    }

    private async executeMirror(mirror: Mirror): Promise<void> {
        this.logger.log(`Executing mirror ${mirror.name} (ID: ${mirror.id})`);
        const res = await this.mirrorService.runMirrorCode('run', mirror.id, (msg: string) => {
            this.logger.debug(`Mirror ${mirror.name} says: ${msg}`);
        });

        if (res != 'OK') this.logger.warn(`Mirror ${mirror.name} execution returned unexpected result: ${res}`);
    }
}
