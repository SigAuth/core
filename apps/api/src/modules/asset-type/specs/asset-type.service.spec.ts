import { DatabaseModule } from '@/internal/database/database.module';
import { AssetTypeService } from '@/modules/asset-type/asset-type.service';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AssetFieldType } from '@sigauth/sdk/architecture';

describe('AssetTypesService', () => {
    let service: AssetTypeService;
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [DatabaseModule, ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] })],
            providers: [AssetTypeService],
        }).compile();

        service = module.get<AssetTypeService>(AssetTypeService);
        await module.init();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create and delete a basic asset type', async () => {
        const resultUuid = await service.createAssetType({
            name: 'Test AssetType',
            fields: [
                { name: 'field1', type: AssetFieldType.VARCHAR, required: true },
                { name: 'field2', type: AssetFieldType.INTEGER, required: false },
            ],
        });
        expect(resultUuid).toBeDefined();

        const assetType = await service.getAssetType(resultUuid!);
        expect(assetType).toBeDefined();

        expect(assetType!.name).toBe('Test AssetType');
        expect(assetType!.fields.length).toBe(2);
        expect(assetType!.fields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'field1', type: AssetFieldType.VARCHAR, required: true }),
                expect.objectContaining({ name: 'field2', type: AssetFieldType.INTEGER, required: false }),
            ]),
        );

        await service.deleteAssetType([resultUuid!]);

        const deletedAssetType = await service.getAssetType(resultUuid!);
        expect(deletedAssetType).toBeNull();
    });

    it('should edit an existing asset type', async () => {
        const resultUuid = await service.createAssetType({
            name: 'Test Editable AssetType',
            fields: [
                { name: 'initialField', type: AssetFieldType.VARCHAR, required: true },
                { name: 'toBeRemovedField', type: AssetFieldType.INTEGER, required: false },
                { name: 'nothingChangedField', type: AssetFieldType.BOOLEAN, required: true },
            ],
        });
        expect(resultUuid).toBeDefined();

        let assetType = await service.getAssetType(resultUuid!);
        expect(assetType).toBeDefined();
        expect(assetType!.name).toBe('Test Editable AssetType');
        expect(assetType!.fields.length).toBe(3);
        expect(assetType!.fields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'initialField', type: AssetFieldType.VARCHAR, required: true }),
                expect.objectContaining({ name: 'toBeRemovedField', type: AssetFieldType.INTEGER, required: false }),
                expect.objectContaining({ name: 'nothingChangedField', type: AssetFieldType.BOOLEAN, required: true }),
            ]),
        );

        const typeReturn = await service.editAssetType({
            uuid: resultUuid!,
            updatedName: 'Test 2 Edited AssetType',
            updatedFields: [
                { originalName: 'initialField', name: 'editedField1', type: AssetFieldType.INTEGER, required: false },
                { name: 'addedField2', type: AssetFieldType.BOOLEAN, required: true },
                { originalName: 'nothingChangedField', name: 'nothingChangedField', type: AssetFieldType.BOOLEAN, required: true },
            ],
        });

        const editedAssetType = await service.getAssetType(resultUuid!);
        expect(editedAssetType).toBeDefined();
        expect(JSON.stringify(typeReturn)).toEqual(JSON.stringify(editedAssetType));

        expect(editedAssetType!.name).toBe('Test 2 Edited AssetType');
        expect(editedAssetType!.fields.length).toBe(3);
        expect(editedAssetType!.fields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'editedField1', type: AssetFieldType.INTEGER, required: false }),
                expect.objectContaining({ name: 'addedField2', type: AssetFieldType.BOOLEAN, required: true }),
                expect.objectContaining({ name: 'nothingChangedField', type: AssetFieldType.BOOLEAN, required: true }),
            ]),
        );

        await service.deleteAssetType([resultUuid!]);

        const deletedAssetType = await service.getAssetType(resultUuid!);
        expect(deletedAssetType).toBeNull();
    });

    afterAll(async () => {
        // delete all asset types created during tests
        const allTypes = await service['db'].DBClient.getAssetTypes();
        for (const type of allTypes) {
            if (type.name.startsWith('Test')) {
                await service.deleteAssetType([type.uuid]);
            }
        }

        await module.close();
    });
});

