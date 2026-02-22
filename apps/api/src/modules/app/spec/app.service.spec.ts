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
            scopes: JSON.stringify({ 'blog:read': 'blog:read', 'blog:write': 'blog:write', 'blog:admin': 'blog:admin', test: 'claimKey' }),
            claims: JSON.stringify({ claimKey: 'claimValue' }),
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
        expect(appDetails!.claims).toBe(JSON.stringify({ claimKey: 'claimValue' }));
        expect(appDetails!.scopes).toBe(
            JSON.stringify({ 'blog:read': 'blog:read', 'blog:write': 'blog:write', 'blog:admin': 'blog:admin', test: 'claimKey' }),
        );
        expect(app).toEqual(appDetails);

        await appService.deleteApps([app.uuid]);
        const deletedApp = await appService.getApp(app.uuid);
        expect(deletedApp).toBeNull();
    });

    it('it should not delete scopes that are shared between apps', async () => {
        const app1 = await appService.createApp({
            name: 'Test App 1',
            permissions: [{ permissions: ['read'], typeUuid: blogType.uuid }],
            scopes: JSON.stringify({ 'test:shared:scope': 'test:shared:scope', 'test:unique:scope1': 'test:unique:scope1' }),
            claims: JSON.stringify({ claimKey: 'claimValue' }),
            url: 'https://example.com',
        });

        const app2 = await appService.createApp({
            name: 'Test App 2',
            permissions: [{ permissions: ['read'], typeUuid: blogType.uuid }],
            scopes: JSON.stringify({ 'test:shared:scope': 'test:shared:scope' }),
            claims: JSON.stringify({ claimKey: 'claimValue' }),
            url: 'https://example.com',
        });

        await appService.deleteApps([app1.uuid]);
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

