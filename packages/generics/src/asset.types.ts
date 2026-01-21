export const ASSET_TYPE_TABLE = '_internal_asset_types';
export const PERMISSION_TABLE = '_internal_permission_instances';
export const ACCESS_TABLE = '_internal_app_access';

export type AssetType = {
    uuid: string;
    name: string;
    fields: (AssetTypeField | AssetTypeRelationField)[];
};

export type AssetTypeField = {
    name: string;
    type: AssetFieldType;
    required?: boolean;
    allowMultiple?: boolean; // Whether multiple assets can be related through that field
};

export type AssetTypeRelationField = AssetTypeField & {
    targetAssetType: string; // UUID of AssetType that the relation points to
    referentialIntegrityStrategy: 'CASCADE' | 'SET_NULL' | 'RESTRICT' | 'INVALIDATE';
};

export enum AssetFieldType {
    BOOLEAN = 0,
    TEXT = 1,
    VARCHAR = 6,

    INTEGER = 2,
    FLOAT8 = 5,

    DATE = 3,
    RELATION = 4,
}

export type Asset = {
    uuid: string;
    name: string;
    [key: string]: string | number | boolean | Date | Asset | Asset[]; // fields with dynamic keys
};
