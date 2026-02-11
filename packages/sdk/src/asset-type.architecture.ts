export const SELF_REFERENCE_ASSET_TYPE_UUID = '00000000-0000-7000-8000-000000000000';

export const INTERNAL_ASSET_TYPE_TABLE = '_internal_asset_types';
export const INTERNAL_GRANT_TABLE = '_internal_grants';
export const INTERNAL_APP_ACCESS_TABLE = '_internal_app_access';
export const INTERNAL_PERMISSION_TABLE = '_internal_permissions';

export type JSONSerializable = string | number | boolean | null | { [key: string]: JSONSerializable } | JSONSerializable[];

export type DefinitiveAssetType = {
    uuid: string;
    name: string;
    fields: (AssetTypeField | AssetTypeRelationField)[];
};

export type AssetTypeField = {
    name: string;
    type: AssetFieldType;
    required: boolean;
    allowMultiple?: boolean; // Whether multiple assets can be related through that field
};

export type AssetTypeRelationField = AssetTypeField & {
    targetAssetType: string; // UUID of AssetType that the relation points to
    referentialIntegrityStrategy: RelationalIntegrityStrategy;
};

export enum RelationalIntegrityStrategy {
    CASCADE = 'CASCADE',
    SET_NULL = 'SET_NULL',
    RESTRICT = 'RESTRICT',
    INVALIDATE = 'INVALIDATE',
}

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
    [key: string]: string | number | boolean | Date; // fields with dynamic keys
};

