import { Asset, AssetType, Container } from './prisma-generated/browser.js';

export abstract class MirrorExecutor {
    abstract create(): Promise<void>;
    abstract run(mirror: number, progressCallback: ProgressCallback, dataUtils: DataUtils): Promise<void>;
    abstract delete(): Promise<void>;
}

export type ProgressCallback = (progress: number, message: string) => void;
export type DataUtils = {
    createAsset: (name: string, typeId: number, fields: Record<string, string | number | boolean>) => Promise<Asset>;
    editAsset: (id: number, name: string, fields: Record<string, string | number | boolean>) => Promise<Asset>;
    deleteAssets: (ids: number[]) => Promise<void>;

    createContainer: (customId: string, name: string, assets: number[], apps: number[]) => Promise<Container>;
    editContainer: (id: number, customId: string, name: string, assets: number[], apps: number[]) => Promise<Container>;
    deleteContainers: (ids: number[]) => Promise<void>;

    getAssets: (ids: number[]) => Promise<Asset[]>;
    getAssetsByFilter: (filter: any) => Promise<Asset[]>;
    getAssetType: (id: number) => Promise<AssetType | null>;
    getContainers: (ids: number[]) => Promise<Container[]>;
    getContainersByFilter: (filter: any) => Promise<Container[]>;
};
