export const FundamentalAssetTypes = [
    'Account',
    'Session',
    'App',
    'AuthorizationInstance',
    'AuthorizationChallenge',
    'AssetType',
    'Grant',
    'AppAccess',
    'Permission',
] as const;

export const AccessableFundamentals = ['Account', 'App'] as const;

export type FundamentalAssetType = (typeof FundamentalAssetTypes)[number];
export type AssetTypeTableMapping = Record<FundamentalAssetType, string> & { [key: string]: string };

export const SigAuthPermissions = {
    ROOT: 'root', // TODO root should be a group of all permissions and not be assignable directly
    CREATE_ASSET: 'create_asset',
    DELETE_ASSET: 'delete_asset',
    EDIT_ASSET: 'edit_asset',
};

export const OIDC_DEFAULT_SCOPES = {
    openid: ['sub'],
    profile: ['name', 'given_name', 'family_name', 'middle_name', 'nickname', 'preferred_username', 'profile', 'picture', 'website'],
    email: ['email', 'email_verified'],
    address: ['address'],
    phone: ['phone_number', 'phone_number_verified'],
};

export const OIDC_DEFAULT_CLAIMS = {
    sub: 'account.uuid',
    name: 'account.name',
    given_name: 'account.givenName',
    family_name: 'account.familyName',
    middle_name: 'account.middleName',
    nickname: 'account.nickname',
    preferred_username: 'account.preferredUsername',
    profile: 'not supported',
    picture: 'not supported',
    website: 'account.website',
    email: 'account.email',
    email_verified: 'account.emailVerified',
    gender: 'account.gender',
    birthdate: 'account.birthdate',
    zoneinfo: 'account.zoneinfo',
    locale: 'account.locale',
    phone_number: 'account.phoneNumber',
    phone_number_verified: 'account.phoneNumberVerified',
    address: 'account.address',
    updated_at: 'account.updatedAt',
};

export type ProtectedData = {
    sigauthAppUuid: string;
};

