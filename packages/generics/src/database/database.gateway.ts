import { TableIdSignature } from 'src/database/orm-client/sigauth.client.js';
import { GenericLogger } from 'src/logger/logger.abstract.js';
import { Asset, AssetType, AssetTypeField, AssetTypeRelationField } from '../asset.types.js';

export abstract class GenericDatabaseGateway {
    protected readonly logger: GenericLogger;

    constructor(logger: GenericLogger) {
        this.logger = logger;
    }

    abstract connect(connectionString?: string);

    abstract disconnect();

    abstract initializeSchema(): Promise<TableIdSignature>;

    abstract rawQuery<T>(queryString: string): Promise<T[]>;

    abstract createAssetType(name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<string | undefined>;

    abstract editAssetType(uuid: string, name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<boolean>;

    abstract deleteAssetType(uuid: string): Promise<boolean>;

    abstract getAssetTypeFields(uuid: string): Promise<AssetTypeField[]>;

    abstract getAssetTypes(): Promise<AssetType[]>;

    abstract getAssetByUuid<T extends Asset>(typeUuid: string, assetUuid: string): Promise<T | null>;
}

