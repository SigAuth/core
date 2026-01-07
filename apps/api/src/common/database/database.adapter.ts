import { AssetType, AssetTypeField, AssetTypeRelationField } from '@/common/types/asset.types';

export abstract class DatabaseAdapter {
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;

    abstract query<T>(queryString: string, params?: any[]): Promise<T[]>;

    abstract createAssetType(name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<AssetType>;

    abstract editAssetType(uuid: string, name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<AssetType>;

    abstract deleteAssetType(uuid: string): Promise<void>;
}
