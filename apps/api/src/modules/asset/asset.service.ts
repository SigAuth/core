import { ORMService } from '@/internal/database/orm.client';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Asset, AssetType } from '../../../../../packages/sdk/dist/asset.types';

@Injectable()
export class AssetService {
    constructor(private readonly db: ORMService) {}
    async createOrUpdateAsset(
        assetUuid: string | undefined,
        name: string,
        assetTypeUuid: string,
        fields: Record<string, string | number | boolean | Date>,
    ): Promise<Asset> {
        const assetType = await this.db.AssetType.findOne({ where: { uuid: assetTypeUuid } });
        if (!assetType) throw new NotFoundException('Invalid asset type');

        const typeFields = await this.db.DBClient.getAssetTypeFields(assetTypeUuid, assetType.externalJoinKeys);
        if (!typeFields.filter(f => f.required).every(af => Object.keys(fields).includes(af.name)))
            throw new BadRequestException('Required fields are missing');
        if (Object.values(fields).some(v => v === undefined)) throw new BadRequestException('Some fields have undefined values');
        if (Object.keys(fields).every(k => !typeFields.find(f => f.name == k)))
            throw new BadRequestException(
                'Unknown fields provided (' +
                    Object.keys(fields)
                        .filter(k => !typeFields.find(f => f.name == k))
                        .join(', ') +
                    ')',
            );

        // check if every variable is of the right type
        // Lets try to let the database do that by creating the Asset in a try catch
        // for (const field of Object.entries(fields)) {
        //     const correspondingField = typeFields.find(f => f.name == field[0]);
        //     const targetType =
        //         correspondingField?.type === AssetFieldType.TEXT
        //             ? 'string'
        //             : correspondingField?.type === AssetFieldType.CHECKFIELD
        //               ? 'boolean'
        //               : 'number';

        //     if (typeof field[1] != targetType)
        //         throw new BadRequestException(
        //             'Invalid field type ( field: ' + field[0].toString() + ' must be of type ' + targetType + ')',
        //         );
        // }

        try {
            const assetType = await this.db.DBClient.getAssetType(assetTypeUuid);
            if (!assetType) throw new NotFoundException('Asset type not found');

            if (assetUuid) {
                return this.db.DBClient.updateAsset<Asset>(assetType, assetUuid, name, fields);
            } else {
                return this.db.DBClient.createAsset<Asset>(assetType, name, fields);
            }
        } catch (e: any) {
            throw new BadRequestException('One or more fields have invalid types or values' + e.message);
        }
    }

    async deleteAssets(data: { typeUuid: string; uuid: string }[]): Promise<Asset[]> {
        const results = await Promise.all(data.map(d => this.db.DBClient.getAssetByUuid<Asset>(d.typeUuid, d.uuid)));
        const assets = results.filter((a): a is Asset => a !== null);

        if (assets.length == 0 || assets.length != data.length) throw new NotFoundException('Not all asset found or invalid ids provided');

        const typeCache: AssetType[] = [];
        for (const a of assets) {
            let assetType = typeCache.find(t => t.uuid == data.find(d => d.uuid == a.uuid)?.typeUuid) ?? null;
            if (!assetType) {
                assetType = await this.db.DBClient.getAssetType(data.find(d => d.uuid == a.uuid)!.typeUuid);
                if (!assetType) throw new NotFoundException('Asset type not found for asset ' + a.uuid);
                typeCache.push(assetType);
            }
            await this.db.DBClient.deleteAsset(assetType, a.uuid);
        }

        return assets;
    }
}

