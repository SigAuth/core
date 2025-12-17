import { Account, Asset, AssetType, PermissionInstance } from 'src/prisma-generated/browser.js';

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

export enum AssetFieldType {
    TEXT = 1,
    NUMBER = 2,
    CHECKFIELD = 3,
    ASSET = 5,
    ACCOUNT = 6,
    APP = 7,
}

export type AppInfo = {
    permissions: AppPermission;
    webFetch: AppWebFetch;
    accounts: Account[];
    assets: Asset[];
    assetTypes: AssetType[];
    containerAssets: Asset[];
};

export type UserInfo = {
    permissions: PermissionInstance[];
};
