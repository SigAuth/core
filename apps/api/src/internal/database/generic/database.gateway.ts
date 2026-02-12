import { Logger } from '@nestjs/common';
import { Asset, AssetTypeField, AssetTypeRelationField, DefinitiveAssetType } from '@sigauth/sdk/architecture';
import { AssetTypeTableMapping } from '@sigauth/sdk/protected';

export const ASSET_TYPE_CHANGE_EVENT = 'asset-type.change';

export abstract class GenericDatabaseGateway {
    protected readonly logger: Logger;

    constructor(loggerName?: string) {
        this.logger = new Logger(loggerName || GenericDatabaseGateway.name);
    }

    abstract connect(connectionString?: string): Promise<void>;

    abstract disconnect(): Promise<void>;

    abstract initializeSchema(): Promise<AssetTypeTableMapping>;

    abstract rawQuery<T>(queryString: string): Promise<T[]>;

    abstract createAssetType(name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<string | undefined>;

    abstract editAssetType(
        uuid: string,
        name: string,
        fields: ((AssetTypeField | AssetTypeRelationField) & { originalName?: string })[],
    ): Promise<DefinitiveAssetType>;

    abstract deleteAssetType(uuid: string): Promise<void>;

    abstract getAssetTypeFields(uuid: string, externalJoinKeys?: string[]): Promise<AssetTypeField[]>;

    abstract getAssetType(uuid: string): Promise<DefinitiveAssetType | null>;

    abstract getAssetTypes(): Promise<DefinitiveAssetType[]>;

    abstract getAssetByUuid<T extends Asset>(typeUuid: string, assetUuid: string): Promise<T | null>;

    abstract createAsset<T extends Asset>(assetType: DefinitiveAssetType, fields: Record<string, any>): Promise<T>;

    abstract updateAsset<T extends Asset>(assetType: DefinitiveAssetType, assetUuid: string, fields: Record<string, any>): Promise<T>;

    abstract deleteAsset(assetType: DefinitiveAssetType, assetUuid: string): Promise<boolean>;

    abstract getAssetsByType<T extends Asset>(typeUuid: string): Promise<T[]>;

    abstract generateAssetTypeTableMapping(refetch?: boolean): Promise<AssetTypeTableMapping>;
}

