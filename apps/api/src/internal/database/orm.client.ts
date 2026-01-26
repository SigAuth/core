import { DatabaseGateway } from '@/internal/database/database.gateway';
import { SigauthClient } from '@/internal/database/orm-client/sigauth.client';
import { StorageService } from '@/internal/database/storage.service';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SELF_REFERENCE_ASSET_TYPE_UUID } from '@sigauth/generics/asset';
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

        if (!this.storage.SigAuthAppUuid || !(await this.App.findOne({ where: { uuid: this.storage.SigAuthAppUuid } }))) {
            this.logger.warn('SigAuth App not found in database. Creating default SigAuth App entry.');
            const app = await this.App.createOne({
                data: {
                    name: 'SigAuth Internal App',
                    url: 'http://localhost',
                },
            });

            // adding default sigauth scopes
            const sigauthScopes = await this.Permission.createMany({
                data: [
                    { appUuid: app.uuid, typeUuid: undefined, permission: 'root' },
                    { appUuid: app.uuid, typeUuid: SELF_REFERENCE_ASSET_TYPE_UUID, permission: 'create' },
                    { appUuid: app.uuid, typeUuid: SELF_REFERENCE_ASSET_TYPE_UUID, permission: 'delete' },
                    { appUuid: app.uuid, typeUuid: SELF_REFERENCE_ASSET_TYPE_UUID, permission: 'create' },
                ],
            });
            this.storage.saveConfigFile({ sigauthAppUuid: app.uuid });
        }

        const appId = this.storage.SigAuthAppUuid!;
        const accounts = await this.Account.findOne({});
        if (!accounts) {
            this.logger.warn('No accounts found in database. Creating dummy account for initial setup.');
            const account = await this.Account.createOne({
                data: {
                    username: 'admin',
                    passwordHash: bcrypt.hashSync('admin', 10),
                    deactivated: false,
                    email: 'administrator@localhost',
                },
            });

            await this.Grant.createMany({
                data: [
                    {
                        accountUuid: account.uuid,
                        appUuid: appId,
                        assetUuid: undefined,
                        typeUuid: undefined,
                        permission: 'root',
                        grantable: true,
                    },
                    {
                        accountUuid: account.uuid,
                        appUuid: appId,
                        typeUuid: SELF_REFERENCE_ASSET_TYPE_UUID,
                        assetUuid: this.storage.InstancedSignature.Account,
                        permission: 'create',
                        grantable: true,
                    },
                ],
            });
        }
    }

    get DBClient() {
        return this.db;
    }
}
