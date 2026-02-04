export type TableIdSignature = {
    Account: string;
    Session: string;
    App: string;
    AppScope: string;
    AuthorizationInstance: string;
    AuthorizationChallenge: string;

    // Internal
    AssetType: string;
    Grant: string;
    AppAccess: string;
    Permission: string;
};

export const SigAuthPermissions = {
    ROOT: 'root', // TODO root should be a group of all permissions and not be assignable directly
    CREATE_ASSET: 'create_asset',
    DELETE_ASSET: 'delete_asset',
    EDIT_ASSET: 'edit_asset',
};

export type ProtectedData = {
    signatures: TableIdSignature;
    sigauthAppUuid: string;
};

