import { GenericDatabaseGateway } from '@/internal/database/generic/database.gateway';
import { SigauthClient } from '@/internal/database/generic/orm-client/sigauth.client';
import { StorageService } from '@/internal/database/storage.service';
import { Utils } from '@/internal/utils';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SELF_REFERENCE_ASSET_TYPE_UUID } from '@sigauth/sdk/asset';
import { SigAuthPermissions } from '@sigauth/sdk/protected';
import bcrypt from 'bcryptjs';

@Injectable()
export class ORMService extends SigauthClient implements OnApplicationBootstrap {
    private readonly logger: Logger;

    constructor(
        private readonly db: GenericDatabaseGateway,
        private readonly storage: StorageService,
    ) {
        super();
        this.logger = new Logger(ORMService.name);
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
                        assetUuid: Utils.convertSignatureToUuid(this.storage.InstancedSignature.Account),
                        permission: SigAuthPermissions.CREATE_ASSET,
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

