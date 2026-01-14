import { AssetType } from '@sigauth/generics/asset';

export abstract class DatabaseGateway {
    abstract connect(connectionString: string): Promise<boolean>;

    abstract disconnect(): Promise<boolean>;

    abstract getAssetTypes(): Promise<AssetType[]>;
}
