import { AssetFieldType, RelationalIntegrityStrategy } from 'src/asset-type.architecture.js';

type WithUuid<HasUuid extends boolean> = HasUuid extends true ? { uuid: string } : {};

type TypeMapping = {
    [AssetFieldType.VARCHAR]: string;
    [AssetFieldType.BOOLEAN]: boolean;
    [AssetFieldType.TEXT]: string;
    [AssetFieldType.INTEGER]: number;
    [AssetFieldType.FLOAT8]: number;
    [AssetFieldType.DATE]: Date;
    [AssetFieldType.RELATION]: string;
};

export type InferSchema<T extends readonly any[], HasUuid extends boolean = true> =
    // (required: true)
    { [K in T[number] as K['required'] extends true ? K['name'] : never]: TypeMapping[K['type']] } & {
        // (required: false -> nullable)
        [K in T[number] as K['required'] extends true ? never : K['name']]?: TypeMapping[K['type']];
    } & WithUuid<HasUuid>;

export function defineAssetType<
    T extends readonly any[],
    const Options extends { hasUuid?: boolean } = { hasUuid: true }, // Standardmäßig true
>(name: string, staticFields: T, options?: Options) {
    return {
        name,
        staticFields,
        Type: {} as InferSchema<T, Options['hasUuid'] extends false ? false : true>, // phantom type to be used for type inference when defining and using asset types
        getFields(mapping: Record<string, string>) {
            // helper function to resolve target uuids when database driver is connected and can provide the mapping from type name to uuid
            return staticFields.map(field => {
                if ('targetAsset' in field && field.targetAsset) {
                    return {
                        ...field,
                        targetAssetUuid: mapping[field.targetAsset as string],
                    };
                }
                return field;
            });
        },
    };
}

export const Account = defineAssetType('Account', [
    { name: 'username', type: AssetFieldType.VARCHAR, required: true },
    { name: 'email', type: AssetFieldType.VARCHAR, required: true },
    { name: 'api', type: AssetFieldType.VARCHAR },
    { name: 'twoFactorCode', type: AssetFieldType.VARCHAR },
    { name: 'deactivated', type: AssetFieldType.BOOLEAN, required: true },
    { name: 'passwordHash', type: AssetFieldType.VARCHAR, required: true },
] as const);
export type Account = typeof Account.Type;

export const Session = defineAssetType('Session', [
    {
        name: 'subjectUuid',
        type: AssetFieldType.RELATION,
        required: true,
        targetAssetType: 'Account',
        referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
    },
    { name: 'expire', type: AssetFieldType.INTEGER, required: true }, // todo is there a native way to expire rows in Postgres?
    { name: 'created', type: AssetFieldType.INTEGER, required: true },
] as const);
export type Session = typeof Session.Type;

export const App = defineAssetType('App', [
    { name: 'name', type: AssetFieldType.VARCHAR, required: true },
    { name: 'url', type: AssetFieldType.VARCHAR, required: true },
    { name: 'oidcAuthCodeCb', type: AssetFieldType.VARCHAR },
    { name: 'token', type: AssetFieldType.VARCHAR },
] as const);
export type App = typeof App.Type;

export const AppScope = defineAssetType('AppScope', [
    { name: 'name', type: AssetFieldType.VARCHAR, required: true },
    { name: 'description', type: AssetFieldType.TEXT, required: true },
    { name: 'public', type: AssetFieldType.BOOLEAN, required: true },
    {
        name: 'appUuids',
        type: AssetFieldType.RELATION,
        targetAssetType: 'App',
        referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
        allowMultiple: true,
    },
] as const);
export type AppScope = typeof AppScope.Type;

export const AuthorizationInstance = defineAssetType('AuthorizationInstance', [
    {
        name: 'sessionUuid',
        type: AssetFieldType.RELATION,
        required: true,
        targetAssetType: 'Session',
        referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
    },
    {
        name: 'appUuid',
        type: AssetFieldType.RELATION,
        required: true,
        targetAssetType: 'App',
        referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
    },
    { name: 'refreshToken', type: AssetFieldType.VARCHAR, required: true },
    { name: 'refreshTokenExpire', type: AssetFieldType.INTEGER, required: true },
    { name: 'accessToken', type: AssetFieldType.VARCHAR, required: true },
] as const);
export type AuthorizationInstance = typeof AuthorizationInstance.Type;

export const AuthorizationChallenge = defineAssetType('AuthorizationChallenge', [
    {
        name: 'sessionUuid',
        type: AssetFieldType.RELATION,
        required: true,
        targetAssetType: 'Session',
        referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
    },
    {
        name: 'appUuid',
        type: AssetFieldType.RELATION,
        required: true,
        targetAssetType: 'App',
        referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
    },
    { name: 'authCode', type: AssetFieldType.VARCHAR, required: true },
    { name: 'challenge', type: AssetFieldType.VARCHAR, required: true },
    { name: 'redirectUri', type: AssetFieldType.VARCHAR, required: true },
    { name: 'created', type: AssetFieldType.DATE, required: true },
] as const);
export type AuthorizationChallenge = typeof AuthorizationChallenge.Type;

// These are no real asset types
export const AssetType = defineAssetType('AssetType', [
    { name: 'name', type: AssetFieldType.VARCHAR, required: true },
    { name: 'externalJoinKeys', type: AssetFieldType.VARCHAR, allowMultiple: true },
] as const);
export type AssetType = typeof AssetType.Type;

export const Grant = defineAssetType(
    'Grant',
    [
        {
            name: 'accountUuid',
            type: AssetFieldType.RELATION,
            required: true,
            targetAssetType: 'Account',
            referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
        },
        { name: 'assetUuid', type: AssetFieldType.VARCHAR },
        {
            name: 'typeUuid',
            type: AssetFieldType.RELATION,
            targetAssetType: 'AssetType',
            referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
        },
        {
            name: 'appUuid',
            type: AssetFieldType.RELATION,
            required: true,
            targetAssetType: 'App',
            referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
        },
        { name: 'permission', type: AssetFieldType.VARCHAR, required: true },
        { name: 'grantable', type: AssetFieldType.BOOLEAN, required: true },
    ] as const,
    { hasUuid: false },
);
export type Grant = typeof Grant.Type;

export const AppAccess = defineAssetType(
    'AppAccess',
    [
        {
            name: 'appUuid',
            type: AssetFieldType.RELATION,
            required: true,
            targetAssetType: 'App',
            referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
        },
        {
            name: 'typeUuid',
            type: AssetFieldType.RELATION,
            required: true,
            targetAssetType: 'AssetType',
            referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
        },
        { name: 'find', type: AssetFieldType.BOOLEAN, required: true },
        { name: 'create', type: AssetFieldType.BOOLEAN, required: true },
        { name: 'edit', type: AssetFieldType.BOOLEAN, required: true },
        { name: 'delete', type: AssetFieldType.BOOLEAN, required: true },
    ] as const,
    { hasUuid: false },
);
export type AppAccess = typeof AppAccess.Type;

export const Permission = defineAssetType(
    'Permission',
    [
        {
            name: 'appUuid',
            type: AssetFieldType.RELATION,
            required: true,
            targetAssetType: 'App',
            referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
        },
        {
            name: 'typeUuid',
            type: AssetFieldType.RELATION,
            targetAssetType: 'AssetType',
            referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
        },
        { name: 'permission', type: AssetFieldType.VARCHAR, required: true },
    ] as const,
    { hasUuid: false },
);
export type Permission = typeof Permission.Type;

