import { Utils } from '@/common/utils';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppPermission, AppWebFetch, AssetFieldType, AssetTypeField } from '@sigauth/generics/json-types';
import { PrismaClient } from '@sigauth/generics/prisma-client';
import { PrismaPg } from '@sigauth/generics/prisma-extended';
import { PROTECTED, SigAuthORPermissions, SigAuthRootPermissions } from '@sigauth/generics/protected';
import * as bcrypt from 'bcryptjs';
import * as process from 'node:process';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
        if ((await this.app.findFirst({ where: { id: PROTECTED.App.id } })) == null) {
            this.logger.warn('SigAuth app not found, instantiating app structure');
            await this.initializeAppStructure();
        }

        if ((await this.account.findFirst({ where: {} })) == null) {
            this.logger.warn('No account found, creating dummy account');
            await this.createDummyAccount();
        }
    }

    private async createDummyAccount() {
        const account = await this.account.create({
            data: {
                name: 'admin',
                password: bcrypt.hashSync('admin', 10),
                email: 'admin@demo.de',
            },
        });

        await this.permissionInstance.create({
            data: {
                accountId: account.id,
                identifier: Utils.convertPermissionNameToIdent(SigAuthRootPermissions.ROOT),
                appId: PROTECTED.App.id,
            },
        });
    }

    private async initializeAppStructure() {
        if (!process.env.FRONTEND_URL) {
            throw new Error('No origin frontend in .env!');
        }

        await this.app.create({
            data: {
                id: PROTECTED.App.id,
                name: PROTECTED.App.name,
                webFetch: {
                    enabled: false,
                    lastFetch: -1,
                    success: false,
                } as AppWebFetch,
                permissions: {
                    asset: Object.values(SigAuthORPermissions),
                    container: [],
                    root: Object.values(SigAuthRootPermissions),
                } as AppPermission,
                token: Utils.generateToken(128),
                url: process.env.FRONTEND_URL,
            },
        });

        await this.assetType.create({
            data: {
                id: PROTECTED.AssetType.id,
                name: PROTECTED.AssetType.name,
                fields: [
                    { id: 0, name: 'Container ID', required: true, type: AssetFieldType.NUMBER } as AssetTypeField,
                    { id: 1, name: 'Container Name', required: true, type: AssetFieldType.TEXT } as AssetTypeField,
                ],
            },
        });

        await this.container.create({
            data: {
                id: PROTECTED.Container.id,
                name: PROTECTED.Container.name,
                apps: [PROTECTED.App.id],
                assets: [],
            },
        });

        // update auto increment counter for assettypes, containers and apps to adapt to manually inserted ids
        await this.$executeRawUnsafe(`SELECT setval('"App_id_seq"', (SELECT MAX(id) FROM "App"));`);
        await this.$executeRawUnsafe(`SELECT setval('"Container_id_seq"', (SELECT MAX(id) FROM "Container"));`);
        await this.$executeRawUnsafe(`SELECT setval('"AssetType_id_seq"', (SELECT MAX(id) FROM "AssetType"));`);
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
