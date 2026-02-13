import { GenericDatabaseGateway } from '@/internal/database/generic/database.gateway';
import { Model } from '@/internal/database/generic/sigauth.client';
import { ModelNeo4J } from '@/internal/database/neo4j/neo4j.model';
import { Injectable } from '@nestjs/common';
import { Asset, AssetTypeField, AssetTypeRelationField, DefinitiveAssetType } from '@sigauth/sdk/architecture';
import { AssetTypeTableMapping } from '@sigauth/sdk/protected';
import neo4j, { Driver } from 'neo4j-driver';

@Injectable()
export class Neo4jDriver extends GenericDatabaseGateway {
    private driver?: Driver;

    get modelClass(): new (...args: any[]) => Model<Record<string, any>> {
        return ModelNeo4J;
    }
    connect(connectionString?: string): Promise<void> {
        if (!this.connect && !process.env.DATABASE_URL) throw new Error('DATABASE_URL not set in env');
        this.driver = neo4j.driver(process.env.DATABASE_URL!, neo4j.auth.basic('username', 'password'));
        return Promise.resolve();
    }
    disconnect(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    initializeSchema(): Promise<AssetTypeTableMapping> {
        throw new Error('Method not implemented.');
    }
    rawQuery<T>(queryString: string): Promise<T[]> {
        throw new Error('Method not implemented.');
    }
    createAssetType(name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<string | undefined> {
        throw new Error('Method not implemented.');
    }
    editAssetType(
        uuid: string,
        name: string,
        fields: ((AssetTypeField | AssetTypeRelationField) & { originalName?: string })[],
    ): Promise<DefinitiveAssetType> {
        throw new Error('Method not implemented.');
    }
    deleteAssetType(uuid: string): Promise<void> {
        throw new Error('Method not implemented.');
    }
    getAssetTypeFields(uuid: string, externalJoinKeys?: string[]): Promise<AssetTypeField[]> {
        throw new Error('Method not implemented.');
    }
    getAssetType(uuid: string): Promise<DefinitiveAssetType | null> {
        throw new Error('Method not implemented.');
    }
    getAssetTypes(): Promise<DefinitiveAssetType[]> {
        throw new Error('Method not implemented.');
    }
    getAssetByUuid<T extends Asset>(typeUuid: string, assetUuid: string): Promise<T | null> {
        throw new Error('Method not implemented.');
    }
    createAsset<T extends Asset>(assetType: DefinitiveAssetType, fields: Record<string, any>): Promise<T> {
        throw new Error('Method not implemented.');
    }
    updateAsset<T extends Asset>(assetType: DefinitiveAssetType, assetUuid: string, fields: Record<string, any>): Promise<T> {
        throw new Error('Method not implemented.');
    }
    deleteAsset(assetType: DefinitiveAssetType, assetUuid: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    getAssetsByType<T extends Asset>(typeUuid: string): Promise<T[]> {
        throw new Error('Method not implemented.');
    }
    generateAssetTypeTableMapping(refetch?: boolean): Promise<AssetTypeTableMapping> {
        throw new Error('Method not implemented.');
    }
}
