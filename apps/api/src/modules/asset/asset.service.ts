import { CreateInput, CreateManyInput, DeleteInput, FindQuery, UpdateInput } from '@/internal/database/generic/orm-client/sigauth.client';
import { ORMService } from '@/internal/database/orm.client';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Asset, DefinitiveAssetType } from '@sigauth/sdk/architecture';

@Injectable()
export class AssetService {
    private readonly logger = new Logger(AssetService.name);

    constructor(private readonly db: ORMService) {}
    async createOrUpdateAsset(
        assetUuid: string | undefined,
        assetTypeUuid: string,
        fields: Record<string, string[] | string | number | boolean | Date>,
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

        try {
            const assetType = await this.db.DBClient.getAssetType(assetTypeUuid);
            if (!assetType) throw new NotFoundException('Asset type not found');

            // Type checks are outsourced to db which will throw an error
            if (assetUuid) {
                return this.db.DBClient.updateAsset<Asset>(assetType, assetUuid, fields);
            } else {
                return this.db.DBClient.createAsset<Asset>(assetType, fields);
            }
        } catch (e: any) {
            throw new BadRequestException('One or more fields have invalid types or values' + e.message);
        }
    }

    async deleteAssets(data: { typeUuid: string; uuid: string }[]): Promise<Asset[]> {
        const results = await Promise.all(data.map(d => this.db.DBClient.getAssetByUuid<Asset>(d.typeUuid, d.uuid)));
        const assets = results.filter((a): a is Asset => a !== null);

        if (assets.length == 0 || assets.length != data.length) throw new NotFoundException('Not all asset found or invalid ids provided');

        const typeCache: DefinitiveAssetType[] = [];
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

    async getAsset<T extends Asset>(typeUuid: string, assetUuid: string): Promise<T | null> {
        return this.db.DBClient.getAssetByUuid<T>(typeUuid, assetUuid);
    }

    async remoteFindAsset(typeUuid: string, query: FindQuery<any>): Promise<Asset[]> {
        const type = await this.db.DBClient.getAssetType(typeUuid);
        if (!type) throw new NotFoundException('Asset type not found');

        // TODO check for App Access

        return this.db.getModel(type.name).findMany(query) as any;
    }

    async remoteCreateOne(typeUuid: string, query: CreateInput<any>): Promise<Asset> {
        const type = await this.db.DBClient.getAssetType(typeUuid);
        if (!type) throw new NotFoundException('Asset type not found');

        // TODO check for App Access

        return (await this.db.getModel(type.name).createOne(query)) as Asset;
    }

    async remoteCreateMany(typeUuid: string, query: CreateManyInput<object>): Promise<Asset[]> {
        const type = await this.db.DBClient.getAssetType(typeUuid);
        if (!type) throw new NotFoundException('Asset type not found');

        // TODO check for App Access

        return (await this.db.getModel(type.name).createMany(query)) as Asset[];
    }

    async remoteUpdateOne(typeUuid: string, query: UpdateInput<any>): Promise<Asset> {
        const type = await this.db.DBClient.getAssetType(typeUuid);
        if (!type) throw new NotFoundException('Asset type not found');

        // TODO check for App Access

        return (await this.db.getModel(type.name).updateOne(query)) as Asset;
    }

    async remoteUpdateMany(typeUuid: string, query: UpdateInput<any>): Promise<Asset[]> {
        const type = await this.db.DBClient.getAssetType(typeUuid);
        if (!type) throw new NotFoundException('Asset type not found');

        // TODO check for App Access

        return (await this.db.getModel(type.name).updateMany(query)) as Asset[];
    }

    async remoteDeleteOne(typeUuid: string, query: DeleteInput<any>): Promise<Asset> {
        const type = await this.db.DBClient.getAssetType(typeUuid);
        if (!type) throw new NotFoundException('Asset type not found');

        // TODO check for App Access

        return (await this.db.getModel(type.name).deleteOne(query)) as Asset;
    }

    async remoteDeleteMany(typeUuid: string, query: DeleteInput<any>): Promise<Asset[]> {
        const type = await this.db.DBClient.getAssetType(typeUuid);
        if (!type) throw new NotFoundException('Asset type not found');

        // TODO check for App Access

        return (await this.db.getModel(type.name).deleteMany(query)) as Asset[];
    }
}

