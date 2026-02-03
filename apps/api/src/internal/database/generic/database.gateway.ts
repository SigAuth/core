import { Logger } from '@nestjs/common';
import { Asset, AssetType, AssetTypeField, AssetTypeRelationField } from '@sigauth/sdk/asset';
import { TableIdSignature } from '@sigauth/sdk/protected';

export abstract class GenericDatabaseGateway {
    protected readonly logger: Logger;

    constructor(loggerName?: string) {
        this.logger = new Logger(loggerName || GenericDatabaseGateway.name);
    }

    abstract connect(connectionString?: string): Promise<void>;

    abstract disconnect(): Promise<void>;

    abstract initializeSchema(): Promise<TableIdSignature>;

    abstract rawQuery<T>(queryString: string): Promise<T[]>;

    abstract createAssetType(name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<string | undefined>;

    abstract editAssetType(uuid: string, name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<AssetType>;

    abstract deleteAssetType(uuid: string): Promise<void>;

    abstract getAssetTypeFields(uuid: string, externalJoinKeys?: string[]): Promise<AssetTypeField[]>;

    abstract getAssetType(uuid: string): Promise<AssetType | null>;

    abstract getAssetTypes(): Promise<AssetType[]>;

    abstract getAssetByUuid<T extends Asset>(typeUuid: string, assetUuid: string): Promise<T | null>;

    abstract createAsset<T extends Asset>(assetType: AssetType, name: string, fields: Record<string, any>): Promise<T>;

    abstract updateAsset<T extends Asset>(
        assetType: AssetType,
        assetUuid: string,
        name: string | undefined,
        fields: Record<string, any>,
    ): Promise<T>;

    abstract deleteAsset(assetType: AssetType, assetUuid: string): Promise<boolean>;

    abstract getAssetsByType<T extends Asset>(typeUuid: string): Promise<T[]>;
}

