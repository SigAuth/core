export const FundamentalAssetTypes = [
    'Account',
    'Session',
    'App',
    'AppScope',
    'AuthorizationInstance',
    'AuthorizationChallenge',
    'AssetType',
    'Grant',
    'AppAccess',
    'Permission',
] as const;

export type FundamentalAssetType = (typeof FundamentalAssetTypes)[number];
export type FundamentalAssetTypeMapping = Record<FundamentalAssetType, string>;

export const SigAuthPermissions = {
    ROOT: 'root', // TODO root should be a group of all permissions and not be assignable directly
    CREATE_ASSET: 'create_asset',
    DELETE_ASSET: 'delete_asset',
    EDIT_ASSET: 'edit_asset',
};

export type ProtectedData = {
    mapping: FundamentalAssetTypeMapping;
    sigauthAppUuid: string;
};

