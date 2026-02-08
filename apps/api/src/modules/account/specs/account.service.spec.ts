import { DatabaseModule } from '@/internal/database/database.module';
import { AccountService } from '@/modules/account/account.service';
import { AppsService } from '@/modules/app/app.service';
import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { AssetService } from '@/modules/asset/asset.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AssetFieldType, SELF_REFERENCE_ASSET_TYPE_UUID } from '@sigauth/sdk/asset';

describe('AccountService', () => {
    let service: AccountService;
    let appService: AppsService;
    let typeService: AssetTypeService;
    let assetService: AssetService;

    let module: TestingModule;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [DatabaseModule, HttpModule, ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] })],
            providers: [AccountService, AppsService, AssetTypeService, AssetService],
        }).compile();
        await module.init();

        service = module.get<AccountService>(AccountService);
        appService = module.get<AppsService>(AppsService);
        typeService = module.get<AssetTypeService>(AssetTypeService);
        assetService = module.get<AssetService>(AssetService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create, edit and delete an account', async () => {
        const account = await service.createAccount({
            email: 'test@example.com',
            apiAccess: false,
            password: 'password123',
            username: 'testuser',
        });

        expect(account).toBeDefined();
        let fetchedAccount = await service.getAccount(account.uuid);
        expect(fetchedAccount).toEqual(account);

        expect(account.api).toBeNull();
        expect(account.passwordHash).toBeDefined();
        expect(account.passwordHash).not.toBe('password123');

        expect(account.username).toBe('testuser');
        expect(account.email).toBe('test@example.com');

        const updated = await service.editAccount({
            uuid: account.uuid,
            username: 'updateduser',
            apiAccess: true,
            deactivated: true,
        });

        expect(updated).toBeDefined();
        fetchedAccount = await service.getAccount(account.uuid);
        expect(updated).toEqual(fetchedAccount);
        expect(updated.username).toBe('updateduser');
        expect(updated.api).toBeDefined();
        expect(updated.deactivated).toBe(true);

        await service.logOutAll(account.uuid);
        const sessions = await service['db'].Session.findMany({ where: { subjectUuid: account.uuid } });
        expect(sessions).toEqual([]);

        await service.deleteAccount({ accountUuids: [account.uuid] });
        const deletedAccount = await service.getAccount(account.uuid);
        expect(deletedAccount).toBeNull();
    });

    it('should set permissions correctly', async () => {
        const account = await service.createAccount({
            email: 'test@example.com',
            apiAccess: false,
            password: 'password123',
            username: 'permissionsuser',
        });

        const typeUuid = await typeService.createAssetType({
            name: 'Test Type',
            fields: [
                {
                    name: 'field1',
                    type: AssetFieldType.VARCHAR,
                },
                {
                    name: 'field2',
                    type: AssetFieldType.VARCHAR,
                },
            ],
        });
        expect(typeUuid).toBeDefined();

        const app = await appService.createApp({
            name: 'Test App',
            url: 'https://testapp.com',
            permissions: [{ typeUuid: typeUuid, permissions: ['read', 'write', 'execute'] }],
            scopes: ['scope1'],
        });

        const asset = await assetService.createOrUpdateAsset(undefined, typeUuid!, { field1: 'value1', field2: 'value2' });

        await expect(
            service.setPermissions({
                accountUuid: account.uuid,
                permissions: [
                    { typeUuid: typeUuid, appUuid: app.uuid, assetUuid: asset.uuid, grantable: false, permission: 'read' },
                    {
                        typeUuid: undefined,
                        appUuid: app.uuid,
                        assetUuid: SELF_REFERENCE_ASSET_TYPE_UUID,
                        grantable: true,
                        permission: 'execute',
                    },
                    { typeUuid: typeUuid, appUuid: app.uuid, assetUuid: asset.uuid, grantable: true, permission: 'write' },
                ],
            }),
        ).resolves.not.toThrow();

        await expect(
            service.setPermissions({
                accountUuid: account.uuid,
                permissions: [{ typeUuid: typeUuid, appUuid: app.uuid, assetUuid: asset.uuid, grantable: true, permission: 'nonexistent' }],
            }),
        ).rejects.toThrow();

        let fetched = await service.getAccount(account.uuid, true);
        expect(fetched).toBeDefined();
        expect(fetched!.account_grants).toHaveLength(3);
        const perms = fetched!.account_grants?.map(g => g.permission);
        expect(perms).toContain('read');
        expect(perms).toContain('write');
        expect(perms).toContain('execute');

        await expect(
            service.setPermissions({
                accountUuid: account.uuid,
                permissions: [{ typeUuid: typeUuid, appUuid: app.uuid, assetUuid: asset.uuid, grantable: true, permission: 'write' }],
            }),
        ).resolves.not.toThrow();

        fetched = await service.getAccount(account.uuid, true);
        expect(fetched).toBeDefined();
        expect(fetched!.account_grants).toHaveLength(1);
        const editperms = fetched!.account_grants?.map(g => g.permission);
        expect(editperms).toContain('write');

        await expect(
            service.setPermissions({
                accountUuid: account.uuid,
                permissions: [
                    { typeUuid: typeUuid, appUuid: app.uuid, assetUuid: asset.uuid, grantable: false, permission: 'read' },
                    {
                        typeUuid: undefined,
                        appUuid: app.uuid,
                        assetUuid: SELF_REFERENCE_ASSET_TYPE_UUID,
                        grantable: true,
                        permission: 'execute',
                    },
                    { typeUuid: typeUuid, appUuid: app.uuid, assetUuid: asset.uuid, grantable: true, permission: 'write' },
                ],
            }),
        ).resolves.not.toThrow();

        await assetService.deleteAssets([{ typeUuid: typeUuid!, uuid: asset.uuid }]);
        fetched = await service.getAccount(account.uuid, true);
        expect(fetched).toBeDefined();
        expect(fetched!.account_grants).toHaveLength(1);
        const remainingPerms = fetched!.account_grants?.map(g => g.permission);
        expect(remainingPerms).toContain('execute');

        await typeService.deleteAssetType([typeUuid!]);
        await appService.deleteApps([app.uuid]);

        fetched = await service.getAccount(account.uuid, true);
        expect(fetched).toBeDefined();
        expect(fetched!.account_grants).toHaveLength(0);

        expect(await service.getAccount(account.uuid, true)).toBeDefined();
        await service.deleteAccount({ accountUuids: [account.uuid] });
    });

    afterEach(async () => {
        if (service) {
            await service['db'].Account.deleteMany({
                where: {
                    email: 'test@example.com',
                },
            });
        }

        if (module) {
            await module.close();
        }
    });
});

