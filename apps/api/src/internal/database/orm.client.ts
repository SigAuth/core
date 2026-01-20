import { SigauthClient } from '@/internal/client/sigauth.client';
import { DatabaseGateway } from '@/internal/database/database.gateway';
import { StorageService } from '@/internal/database/storage.service';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import bcrypt from 'bcryptjs';

@Injectable()
export class ORMService extends SigauthClient implements OnApplicationBootstrap {
    private readonly logger = new Logger(ORMService.name);

    constructor(
        private readonly db: DatabaseGateway,
        private readonly storage: StorageService,
    ) {
        super();
    }

    async onApplicationBootstrap() {
        await this.db.connect();

        if (!this.storage.InstancedSignature) {
            throw new Error('Cannot initialize ORMService without instance signature loaded in StorageService.');
        }
        this.init(this.storage.InstancedSignature, this.db);
        const accounts = await this.Account.findOne({});
        if (!accounts) {
            this.logger.warn('No accounts found in database. Creating dummy account for initial setup.');
            await this.Account.createOne({
                data: {
                    username: 'admin',
                    passwordHash: bcrypt.hashSync('admin', 10),
                    deactivated: false,
                    email: 'administrator@localhost',
                },
            });
        }
    }
}
