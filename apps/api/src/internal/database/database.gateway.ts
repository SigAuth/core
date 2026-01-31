import { StorageService } from '@/internal/database/storage.service';
import { Injectable, Logger } from '@nestjs/common';
import { AssetTypeField, AssetTypeRelationField } from '@sigauth/generics/asset';

@Injectable()
export abstract class DatabaseGateway {
    protected readonly storage: StorageService;
    protected readonly logger;

    constructor(private readonly _storage: StorageService) {
        this.storage = _storage;
        this.logger = new Logger(DatabaseGateway.name);
    }

    abstract connect(): Promise<void>;

    abstract disconnect(): Promise<void>;

    abstract rawQuery<T>(queryString: string, params?: any[]): Promise<T[]>;

    abstract createAssetType(name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<string | undefined>;

    abstract editAssetType(uuid: string, name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<boolean>;

    abstract deleteAssetType(uuid: string): Promise<boolean>;
}

