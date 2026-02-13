import { ORMService } from '@/internal/database/generic/orm.client';
import { StorageService } from '@/internal/database/storage.service';
import { Injectable, Logger } from '@nestjs/common';

export interface HealthCheckResult {
    uuid: string;
    name: string;
    status: 'healthy' | 'unhealthy';
}

@Injectable()
export class HealthService {
    private readonly logger = new Logger(HealthService.name);
    private cache: HealthCheckResult[] = [];
    private lastFetch = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000;
    private readonly HEALTH_CHECK_TIMEOUT = 3000;
    private refreshPromise: Promise<HealthCheckResult[]> | null = null;

    constructor(
        private readonly db: ORMService,
        private readonly storage: StorageService,
    ) {}

    private async checkAppHealth(url: string): Promise<'healthy' | 'unhealthy'> {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.HEALTH_CHECK_TIMEOUT);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            return res.ok ? 'healthy' : 'unhealthy';
        } catch (error) {
            this.logger.warn(`Error checking health for ${url}:`, error);
            return 'unhealthy';
        }
    }
    async getAppsHealthStatus(): Promise<HealthCheckResult[]> {
        const now = Date.now();
        if (this.cache.length && now - this.lastFetch < this.CACHE_DURATION) {
            return this.cache;
        }
        if (this.refreshPromise) {
            return this.refreshPromise;
        }
        this.refreshPromise = (async () => {
            try {
                const apps = (await this.db.App.findMany({}))
                    .filter(a => a.uuid != this.storage.SigAuthAppUuid)
                    .map(a => ({ uuid: a.uuid, name: a.name, url: a.url! }));
                const results = await Promise.all(
                    apps.map(async ({ uuid, name, url }) => ({
                        uuid,
                        name,
                        status: await this.checkAppHealth(url),
                    })),
                );
                this.cache = results;
                this.lastFetch = Date.now();
                return results;
            } finally {
                this.refreshPromise = null;
            }
        })();
        return this.refreshPromise;
    }
}
