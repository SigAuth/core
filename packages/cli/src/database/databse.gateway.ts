import { AssetType } from '@sigauth/generics/asset';

export abstract class DatabaseGateway {
    abstract connect(): Promise<boolean>;

    abstract disconnect(): Promise<boolean>;

    abstract getAssetTypes(): Promise<AssetType[]>;
}
