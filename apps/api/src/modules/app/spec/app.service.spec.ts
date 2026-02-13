import { DatabaseModule } from '@/internal/database/database.module';
import { AppsService } from '@/modules/app/app.service';
import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { Test, TestingModule } from '@nestjs/testing';
import { AssetFieldType, DefinitiveAssetType } from '@sigauth/sdk/architecture';

describe('AppService', () => {
    let appService: AppsService;
    let typeService: AssetTypeService;

    let module: TestingModule;
    let blogType: DefinitiveAssetType;

    beforeEach(async () => {
        module = await Test.createTestingModule({
            imports: [DatabaseModule, HttpModule, ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] })],
            providers: [AppsService, AssetTypeService],
        }).compile();
        await module.init();

        appService = module.get<AppsService>(AppsService);
        typeService = module.get<AssetTypeService>(AssetTypeService);
        const typeId = await typeService.createAssetType({
            name: 'Test Blog Post',
            fields: [
                { name: 'title', type: AssetFieldType.VARCHAR, required: true },
                { name: 'content', type: AssetFieldType.TEXT, required: true },
            ],
        });

        blogType = (await typeService.getAssetType(typeId!))!;
    });

    it('should be defined', () => {
        expect(appService).toBeDefined();
        expect(typeService).toBeDefined();
        expect(blogType).toBeDefined();
    });

    it('should create and delete an app', async () => {
        const app = await appService.createApp({
            name: 'Test App',
            permissions: [{ permissions: ['read', 'write', 'admin'], typeUuid: blogType.uuid }],
            scopes: ['test:read:blog', 'test:write:blog'],
            url: 'https://example.com',
        });
        expect(app).toBeDefined();

        const appDetails = await appService.getApp(app.uuid);
        expect(appDetails).toBeDefined();
        expect(appDetails!.name).toBe('Test App');
        expect(appDetails!.url).toBe('https://example.com');
        expect(appDetails?.permission_apps).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    permission: 'read',
                    typeUuid: blogType.uuid,
                }),
                expect.objectContaining({
                    permission: 'write',
                    typeUuid: blogType.uuid,
                }),
                expect.objectContaining({
                    permission: 'admin',
                    typeUuid: blogType.uuid,
                }),
            ]),
        );
        expect(appDetails?.appScope_apps).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    public: false,
                    description: '',
                    name: 'test:read:blog',
                }),
                expect.objectContaining({
                    public: false,
                    description: '',
                    name: 'test:write:blog',
                }),
            ]),
        );
        expect(app).toEqual(appDetails);

        expect(await appService['db'].AppScope.findMany({ where: { appUuids: [app.uuid] } })).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    public: false,
                    description: '',
                    name: 'test:read:blog',
                }),
                expect.objectContaining({
                    public: false,
                    description: '',
                    name: 'test:write:blog',
                }),
            ]),
        );

        await appService.deleteApps([app.uuid]);
        const deletedApp = await appService.getApp(app.uuid);
        expect(deletedApp).toBeNull();

        expect(await appService['db'].AppScope.findMany({ where: { appUuids: [app.uuid] } })).toEqual([]);
    });

    it('it should not delete scopes that are shared between apps', async () => {
        const app1 = await appService.createApp({
            name: 'Test App 1',
            permissions: [{ permissions: ['read'], typeUuid: blogType.uuid }],
            scopes: ['test:shared:scope', 'test:unique:scope1'],
            url: 'https://example.com',
        });

        const app2 = await appService.createApp({
            name: 'Test App 2',
            permissions: [{ permissions: ['read'], typeUuid: blogType.uuid }],
            scopes: ['test:shared:scope'],
            url: 'https://example.com',
        });

        await appService.deleteApps([app1.uuid]);
        const remainingScope = await appService['db'].AppScope.findMany({ where: { name: 'test:shared:scope' } });
        expect(remainingScope).toEqual([
            expect.objectContaining({
                public: false,
                description: '',
                name: 'test:shared:scope',
                appUuids: [app2.uuid],
            }),
        ]);
        const deletedScope = await appService['db'].AppScope.findMany({ where: { name: 'test:unique:scope1' } });
        expect(deletedScope).toEqual([]);

        await appService.deleteApps([app2.uuid]);
        const deletedSharedScope = await appService['db'].AppScope.findMany({ where: { name: 'test:shared:scope' } });
        expect(deletedSharedScope).toEqual([]);
    });

    afterEach(async () => {
        await typeService.deleteAssetType([blogType.uuid]);
        const apps = await appService['db'].App.findMany({});
        for (const app of apps) {
            if (app.name === 'Test App') await appService.deleteApps([app.uuid]);
        }

        await module.close();
    });
});

