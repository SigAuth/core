import { Asset, AssetType } from './prisma-generated/browser.js';

export abstract class MirrorExecutor {
    abstract init(cb: Callback): Promise<void>;
    abstract run(mirror: number, cb: Callback, dataUtils: DataUtils): Promise<void>;
    abstract delete(cb: Callback): Promise<void>;
}

export type Callback = (message: string) => void;
export type DataUtils = {
    createAsset: (name: string, typeId: number, fields: Record<number, string | number>) => Promise<Asset>;
    editAsset: (id: number, name: string, fields: Record<number, string | number>) => Promise<Asset>;
    deleteAssets: (ids: number[]) => Promise<void>;

    getAssets: (ids: number[]) => Promise<Asset[]>;
    getAssetsByFilter: (filter: any) => Promise<Asset[]>;
    getAssetType: (id: number) => Promise<AssetType | null>;
};
