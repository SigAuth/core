import { Injectable } from '@nestjs/common';
import { AssetType, AssetTypeField, AssetTypeRelationField } from '@sigauth/generics/asset';

@Injectable()
export abstract class DatabaseGateway {
    abstract connect(): Promise<void>;

    abstract disconnect(): Promise<void>;

    abstract rawQuery<T>(queryString: string, params?: any[]): Promise<T[]>;

    abstract createAssetType(name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<string | undefined>;

    abstract editAssetType(uuid: string, name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<boolean>;

    abstract deleteAssetType(uuid: string): Promise<boolean>;
}
