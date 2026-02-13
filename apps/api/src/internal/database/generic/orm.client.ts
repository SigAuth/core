import { ASSET_TYPE_CHANGE_EVENT, GenericDatabaseGateway } from '@/internal/database/generic/database.gateway';
import { SigauthClient } from '@/internal/database/generic/sigauth.client';
import { StorageService } from '@/internal/database/storage.service';
import { Utils } from '@/internal/utils';
import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SELF_REFERENCE_ASSET_TYPE_UUID } from '@sigauth/sdk/architecture';
import { SigAuthPermissions } from '@sigauth/sdk/protected';
import { convertTypeTableToUuid } from '@sigauth/sdk/utils';
import bcrypt from 'bcryptjs';

@Injectable()
export class ORMService extends SigauthClient implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger: Logger;
    private refreshInFlight?: Promise<void>;
    private refreshQueued = false;
    private shuttingDown = false;

    constructor(
        private readonly db: GenericDatabaseGateway,
        private readonly storage: StorageService,
    ) {
        super();
        this.logger = new Logger(ORMService.name);
    }

    async onApplicationBootstrap() {
        await this.db.connect();

        if (!this.DBClient.generateAssetTypeTableMapping())
            throw new Error('Cannot initialize ORMService without instance signature loaded in StorageService.');
        await this.init(this.db);

        if (!this.storage.SigAuthAppUuid || !(await this.App.findOne({ where: { uuid: this.storage.SigAuthAppUuid } }))) {
            this.logger.warn('SigAuth App not found in database. Creating default SigAuth App entry.');

            const app = await this.App.createOne({
                data: {
                    name: 'SigAuth Internal App',
                    url: 'http://localhost',
                    token: Utils.generateToken(64),
                },
            });

            this.logger.log('-------------------------------------------------------');
            this.logger.log(`SigAuth App UUID: ${app.uuid}`);
            this.logger.log(`SigAuth App Token: ${app.token}`);
            this.logger.log('Please save the above token securely. And use it to configure your SigAuth admin Dashboard instance.');
            this.logger.log('-------------------------------------------------------');

            // adding default sigauth scopes
            const sigauthScopes = await this.Permission.createMany({
                data: [
                    { appUuid: app.uuid, typeUuid: undefined, permission: Utils.convertPermissionNameToIdent(SigAuthPermissions.ROOT) },
                    {
                        appUuid: app.uuid,
                        typeUuid: SELF_REFERENCE_ASSET_TYPE_UUID,
                        permission: Utils.convertPermissionNameToIdent(SigAuthPermissions.CREATE_ASSET),
                    },
                    {
                        appUuid: app.uuid,
                        typeUuid: SELF_REFERENCE_ASSET_TYPE_UUID,
                        permission: Utils.convertPermissionNameToIdent(SigAuthPermissions.DELETE_ASSET),
                    },
                    {
                        appUuid: app.uuid,
                        typeUuid: SELF_REFERENCE_ASSET_TYPE_UUID,
                        permission: Utils.convertPermissionNameToIdent(SigAuthPermissions.EDIT_ASSET),
                    },
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
                        assetUuid: SELF_REFERENCE_ASSET_TYPE_UUID, // needs a valid uuid because its part of the primary key
                        typeUuid: undefined,
                        permission: SigAuthPermissions.ROOT,
                        grantable: true,
                    },
                    {
                        accountUuid: account.uuid,
                        appUuid: appId,
                        typeUuid: SELF_REFERENCE_ASSET_TYPE_UUID,
                        assetUuid: convertTypeTableToUuid(this.mapping!.Account),
                        permission: SigAuthPermissions.CREATE_ASSET,
                        grantable: true,
                    },
                ],
            });
        }
    }

    @OnEvent(ASSET_TYPE_CHANGE_EVENT)
    async handleOrderCreatedEvent() {
        if (!this.client || this.shuttingDown) return;
        await this.queueSchemaRefresh();
    }

    async onModuleDestroy() {
        this.shuttingDown = true;
        if (this.refreshInFlight) {
            await this.refreshInFlight;
        }
        await this.db.disconnect();
    }

    private async queueSchemaRefresh(): Promise<void> {
        if (this.refreshInFlight) {
            this.refreshQueued = true;
            return this.refreshInFlight;
        }

        this.refreshInFlight = (async () => {
            do {
                this.refreshQueued = false;
                await this.refreshSchema();
            } while (this.refreshQueued);
        })().finally(() => {
            this.refreshInFlight = undefined;
        });

        return this.refreshInFlight;
    }

    get DBClient() {
        return this.db;
    }
}
