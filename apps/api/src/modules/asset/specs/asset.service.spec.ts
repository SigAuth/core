import { DatabaseModule } from '@/internal/database/database.module';
import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { AssetService } from '@/modules/asset/asset.service';
import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { Test, TestingModule } from '@nestjs/testing';
import { AssetFieldType, AssetTypeRelationField, DefinitiveAssetType, RelationalIntegrityStrategy } from '@sigauth/sdk/architecture';

describe('AssetService', () => {
    let assetService: AssetService;
    let typeService: AssetTypeService;

    let module: TestingModule;

    let assetType: DefinitiveAssetType | null;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [DatabaseModule, ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] })],
            providers: [AssetService, AssetTypeService],
        }).compile();

        await module.init();
        assetService = module.get<AssetService>(AssetService);
        typeService = module.get<AssetTypeService>(AssetTypeService);

        const result = await typeService.createAssetType({
            name: 'Test AssetType for Assets',
            fields: [
                { name: 'title', type: AssetFieldType.VARCHAR, required: true },
                { name: 'content', type: AssetFieldType.TEXT, required: false },
                { name: 'published', type: AssetFieldType.BOOLEAN, required: false },
            ],
        });
        assetType = await typeService.getAssetType(result!);
    });

    it('should be defined', () => {
        expect(assetService).toBeDefined();
        expect(typeService).toBeDefined();
        expect(assetType).toBeDefined();
    });

    it('should create and delete a basic asset', async () => {
        const asset = await assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
            title: 'Test Asset Title',
            content: 'This is the content of the test asset.',
        });
        expect(asset).toBeDefined();
        const fetchedAsset = await assetService.getAsset(assetType!.uuid, asset!.uuid);
        expect(fetchedAsset).toBeDefined();
        expect(fetchedAsset!.title as any).toBe('Test Asset Title');
        expect(fetchedAsset!.content as any).toBe('This is the content of the test asset.');

        // Deletion
        const deletedAsset = await assetService.deleteAssets([{ uuid: asset!.uuid, typeUuid: assetType!.uuid }]);
        expect(deletedAsset).toEqual([asset]);
        expect(await assetService.getAsset(assetType!.uuid, asset!.uuid)).toBeNull();
    });

    it('shoud update an existing asset', async () => {
        const asset = await assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
            title: 'Test nitial Title',
            content: 'Initial Content',
        });
        expect(asset).toBeDefined();

        const updatedAsset = await assetService.createOrUpdateAsset(asset!.uuid, assetType!.uuid, {
            title: 'Test Updated Title',
            content: 'Updated Content',
        });
        expect(updatedAsset).toBeDefined();
        expect(updatedAsset.uuid).toBe(asset!.uuid);
        expect(updatedAsset.title as any).toBe('Test Updated Title');
        expect(updatedAsset.content as any).toBe('Updated Content');

        // Deletion
        const deletedAsset = await assetService.deleteAssets([{ uuid: asset!.uuid, typeUuid: assetType!.uuid }]);
        expect(deletedAsset).toEqual([updatedAsset]);
        expect(await assetService.getAsset(assetType!.uuid, asset!.uuid)).toBeNull();
    });

    it('should not create an asset with missing required fields', async () => {
        // Das await muss VOR das expect, damit Jest auf das Promise wartet
        await expect(
            assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
                content: 'Content without title',
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('should not create an asset with unknown fields', async () => {
        await expect(
            assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
                title: 'Title with unknown field',
                unknownField: 'This field does not exist in the asset type',
            } as any),
        ).rejects.toThrow();
    });

    it('should not create an asset with invalid field types', async () => {
        await expect(
            assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
                title: 'TITLE',
                content: 'Valid content',
                published: 'not-a-boolean',
            } as any),
        ).rejects.toThrow();
    });

    it('should create a simple link type', async () => {
        const linkTypeUuid = await typeService.createAssetType({
            name: 'Test Link Type',
            fields: [
                { name: 'likes', type: AssetFieldType.INTEGER, required: false },
                {
                    name: 'linkedAsset',
                    type: AssetFieldType.RELATION,
                    required: false,
                    allowMultiple: false,
                    targetAssetType: assetType!.uuid,
                    referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
                },
            ],
        });
        expect(linkTypeUuid).toBeDefined();

        const linkType = await typeService.getAssetType(linkTypeUuid!);
        expect(linkType).toBeDefined();
        expect(linkType!.fields).toHaveLength(2);
        expect(linkType?.fields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'likes', type: AssetFieldType.INTEGER, required: false }),
                expect.objectContaining({
                    name: 'linkedAsset',
                    type: AssetFieldType.RELATION,
                    required: false,
                    allowMultiple: false,
                    targetAssetType: assetType!.uuid,
                    referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
                }),
            ]),
        );

        const testAsset = await assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
            title: 'Test Asset for Link',
        });

        const linkAsset = await assetService.createOrUpdateAsset(undefined, linkTypeUuid!, {
            likes: 10,
            linkedAsset: testAsset!.uuid,
        });

        expect(linkAsset).toBeDefined();
        const forwardCheck = await assetService.getAsset(linkTypeUuid!, linkAsset!.uuid);
        expect(forwardCheck).toBeDefined();
        expect(forwardCheck!.likes as any).toBe(10);
        expect(forwardCheck!.linkedAsset as any).toBe(testAsset!.uuid);

        // Deletion
        const deletedLinkAsset = await assetService.deleteAssets([
            { uuid: linkAsset!.uuid, typeUuid: linkTypeUuid! },
            { uuid: testAsset!.uuid, typeUuid: assetType!.uuid },
        ]);
        expect(deletedLinkAsset).toEqual([linkAsset, testAsset]);
        expect(await assetService.getAsset(linkTypeUuid!, linkAsset!.uuid)).toBeNull();

        await typeService.deleteAssetType([linkTypeUuid!]);
    });

    it('should create a bidirectional link type', async () => {
        const linkTypeUuid = await typeService.createAssetType({
            name: 'Test Link Type 2',
            fields: [
                { name: 'likes', type: AssetFieldType.INTEGER, required: false },
                {
                    name: 'linkedAsset',
                    type: AssetFieldType.RELATION,
                    required: false,
                    allowMultiple: true,
                    targetAssetType: assetType!.uuid,
                    referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
                },
            ],
        });
        expect(linkTypeUuid).toBeDefined();

        const linkType = await typeService.getAssetType(linkTypeUuid!);
        expect(linkType).toBeDefined();
        expect(linkType!.fields).toHaveLength(2);
        expect(linkType!.fields[1].type).toBe(AssetFieldType.RELATION);
        expect((linkType!.fields[1] as AssetTypeRelationField).targetAssetType).toBe(assetType!.uuid);

        const testAsset1 = await assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
            title: 'Test Asset for Link 1',
        });

        const testAsset2 = await assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
            title: 'Test Asset for Link 2',
        });

        const linkAsset = await assetService.createOrUpdateAsset(undefined, linkTypeUuid!, {
            likes: 10,
            linkedAsset: [testAsset1!.uuid, testAsset2!.uuid],
        });

        expect(linkAsset).toBeDefined();
        const forwardCheck = await assetService.getAsset(linkTypeUuid!, linkAsset!.uuid);
        expect(forwardCheck).toBeDefined();
        expect(forwardCheck).toEqual(linkAsset);
        expect(forwardCheck!.likes as any).toBe(10);
        expect(forwardCheck!.linkedAsset as any).toEqual([testAsset1!.uuid, testAsset2!.uuid]);

        // Deletion
        const deletedLinkAsset = await assetService.deleteAssets([
            { uuid: linkAsset!.uuid, typeUuid: linkTypeUuid! },
            { uuid: testAsset1!.uuid, typeUuid: assetType!.uuid },
            { uuid: testAsset2!.uuid, typeUuid: assetType!.uuid },
        ]);
        expect(deletedLinkAsset).toEqual([linkAsset, testAsset1, testAsset2]);
        expect(await assetService.getAsset(linkTypeUuid!, linkAsset!.uuid)).toBeNull();
    });

    it('should enforce cascade referential integrity on delete for single relation', async () => {
        const linkTypeUuid = await typeService.createAssetType({
            name: 'Test Link Type 3',
            fields: [
                { name: 'likes', type: AssetFieldType.INTEGER, required: false },
                {
                    name: 'linkedAsset',
                    type: AssetFieldType.RELATION,
                    required: false,
                    allowMultiple: false,
                    targetAssetType: assetType!.uuid,
                    referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
                },
            ],
        });
        expect(linkTypeUuid).toBeDefined();

        const testAsset = await assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
            title: 'Test Asset for Cascade Delete',
        });

        const linkAsset = await assetService.createOrUpdateAsset(undefined, linkTypeUuid!, {
            likes: 10,
            linkedAsset: testAsset!.uuid,
        });

        // Delete the linked asset and expect the link asset to be deleted as well due to cascade strategy
        const deletedAssets = await assetService.deleteAssets([{ uuid: testAsset!.uuid, typeUuid: assetType!.uuid }]);
        expect(deletedAssets).toEqual([testAsset]);
        expect(await assetService.getAsset(assetType!.uuid, testAsset!.uuid)).toBeNull();
        expect(await assetService.getAsset(linkTypeUuid!, linkAsset!.uuid)).toBeNull();

        await typeService.deleteAssetType([linkTypeUuid!]);
    });

    it('should enforce setnull referential integrity on delete for single relations', async () => {
        const linkTypeUuid = await typeService.createAssetType({
            name: 'Test Link Type 5',
            fields: [
                { name: 'likes', type: AssetFieldType.INTEGER, required: false },
                {
                    name: 'linkedAsset',
                    type: AssetFieldType.RELATION,
                    required: false,
                    allowMultiple: false,
                    targetAssetType: assetType!.uuid,
                    referentialIntegrityStrategy: RelationalIntegrityStrategy.SET_NULL,
                },
            ],
        });
        expect(linkTypeUuid).toBeDefined();

        const testAsset = await assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
            title: 'Test Asset for SetNull Cascade Delete',
        });

        const linkAsset = await assetService.createOrUpdateAsset(undefined, linkTypeUuid!, {
            likes: 10,
            linkedAsset: testAsset!.uuid,
        });

        // Delete the linked asset and expect the linkedAsset field in the link asset to be set to null
        const deletedAssets = await assetService.deleteAssets([{ uuid: testAsset!.uuid, typeUuid: assetType!.uuid }]);
        expect(deletedAssets).toEqual([testAsset]);
        expect(await assetService.getAsset(assetType!.uuid, testAsset!.uuid)).toBeNull();

        const updatedLinkAsset = await assetService.getAsset(linkTypeUuid!, linkAsset!.uuid);
        expect(updatedLinkAsset).toBeDefined();
        expect(updatedLinkAsset!.linkedAsset).toBeNull();

        // Cleanup
        await assetService.deleteAssets([{ uuid: linkAsset!.uuid, typeUuid: linkTypeUuid! }]);
        await typeService.deleteAssetType([linkTypeUuid!]);
    });

    it('should enforce setnull|cascade referential integrity on cascade delete for multiple relations', async () => {
        const linkTypeUuid = await typeService.createAssetType({
            name: 'Test Link Type 4',
            fields: [
                { name: 'likes', type: AssetFieldType.INTEGER, required: false },
                {
                    name: 'linkedAsset',
                    type: AssetFieldType.RELATION,
                    required: false,
                    allowMultiple: true,
                    targetAssetType: assetType!.uuid,
                    referentialIntegrityStrategy: RelationalIntegrityStrategy.SET_NULL,
                },
            ],
        });

        const testAsset1 = await assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
            title: 'Test Asset for SetNull 1',
        });

        const testAsset2 = await assetService.createOrUpdateAsset(undefined, assetType!.uuid, {
            title: 'Test Asset for SetNull 2',
        });

        const linkAsset = await assetService.createOrUpdateAsset(undefined, linkTypeUuid!, {
            likes: 10,
            linkedAsset: [testAsset1!.uuid, testAsset2!.uuid],
        });

        // Delete one of the linked assets and expect the relation to be set to null for that asset in the link asset
        const deletedAssets = await assetService.deleteAssets([{ uuid: testAsset1!.uuid, typeUuid: assetType!.uuid }]);
        expect(deletedAssets).toEqual([testAsset1]);
        expect(await assetService.getAsset(assetType!.uuid, testAsset1!.uuid)).toBeNull();

        let updatedLinkAsset = await assetService.getAsset(linkTypeUuid!, linkAsset!.uuid);
        expect(updatedLinkAsset).toBeDefined();
        expect(updatedLinkAsset!.linkedAsset as any).toEqual([testAsset2!.uuid]);

        await assetService.deleteAssets([{ uuid: testAsset2!.uuid, typeUuid: assetType!.uuid }]);
        expect(await assetService.getAsset(assetType!.uuid, testAsset2!.uuid)).toBeNull();

        updatedLinkAsset = await assetService.getAsset(linkTypeUuid!, linkAsset!.uuid);
        expect(updatedLinkAsset).toBeDefined();
        expect(updatedLinkAsset!.linkedAsset as any).toEqual([]);

        await typeService.deleteAssetType([linkTypeUuid!]);
    });

    afterAll(async () => {
        const allTypes = await typeService['db'].DBClient.getAssetTypes();
        for (const type of allTypes) {
            if (type.name.startsWith('Test')) {
                await typeService.deleteAssetType([type.uuid]);
            }
        }
        await module.close();
    });
});

