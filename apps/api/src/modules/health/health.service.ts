import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class HealthService {
    private cache: any[] = [];
    private lastFetch = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

    constructor(private readonly prisma: PrismaService) {}

    private async checkAppHealth(url: string): Promise<'healthy' | 'unhealthy'> {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            return res.ok ? 'healthy' : 'unhealthy';
        } catch {
            return 'unhealthy';
        }
    }

    async getHealthApps() {
        const now = Date.now();
        if (this.cache.length && now - this.lastFetch < this.CACHE_DURATION) {
            return this.cache;
        }

        const apps = await this.prisma.app.findMany({
            where: { name: { not: 'SigAuth' } },
            select: { id: true, name: true, url: true },
        });

        const results = await Promise.all(
            apps.map(async ({ id, name, url }) => ({
                id,
                name,
                status: await this.checkAppHealth(url),
            })),
        );

        this.cache = results;
        this.lastFetch = now;

        return results;
    }
}
