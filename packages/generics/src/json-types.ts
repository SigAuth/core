import { Account, Asset, AssetType, Container } from 'src/prisma-generated/browser';
import { PermissionInstance } from 'src/prisma-generated/client';

export type JSONSerializable = string | number | boolean | null | { [key: string]: JSONSerializable } | JSONSerializable[];

export type AppPermission = {
    asset: string[];
    container: string[];
    root: string[];
};

export type AppWebFetch = {
    enabled: boolean;
    success: boolean;
    lastFetch: number;
};

export type AssetTypeField = {
    id: number;
    type: AssetFieldType;
    name: string;
    required: boolean;
    options?: string[];
};

export enum AssetFieldType {
    TEXT = 1,
    NUMBER = 2,
    CHECKFIELD = 3,
    // SELECTION = 4,
    // ASSET = 5,
    // ACCOUNT = 6,
}

export type AppInfo = {
    permissions: AppPermission;
    webFetch: AppWebFetch;
    accounts: Account[];
    assets: Asset[];
    assetTypes: AssetType[];
    containers: Container[];
    containerAssets: Asset[];
};

export type UserInfo = {
    containers: PermissionInstance[];
    assets: PermissionInstance[];
    root: string[];
};
