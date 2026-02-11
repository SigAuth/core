import { AssetFieldType, AssetTypeField, AssetTypeRelationField, RelationalIntegrityStrategy } from './asset-type.architecture.js';
import { convertTypeTableToUuid } from './cli/utils.js';
import { FundamentalAssetTypeMapping } from './protected.types.js';

const accountFields = [
    { name: 'username', type: AssetFieldType.VARCHAR, required: true },
    { name: 'email', type: AssetFieldType.VARCHAR, required: true },
    { name: 'api', type: AssetFieldType.VARCHAR, required: false },
    { name: 'twoFactorCode', type: AssetFieldType.VARCHAR, required: false },
    { name: 'deactivated', type: AssetFieldType.BOOLEAN, required: true },
    { name: 'passwordHash', type: AssetFieldType.VARCHAR, required: true },
] as const satisfies readonly (AssetTypeField | AssetTypeRelationField)[];

const sessionFields = [
    {
        name: 'subjectUuid',
        type: AssetFieldType.RELATION,
        required: true,
        targetAssetType: 'Account',
        referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
    },
    { name: 'expire', type: AssetFieldType.INTEGER, required: true }, // todo is there a native way to expire rows in Postgres?
    { name: 'created', type: AssetFieldType.INTEGER, required: true },
] as const satisfies readonly (AssetTypeField | AssetTypeRelationField)[];

const appFields = [
    { name: 'name', type: AssetFieldType.VARCHAR, required: true },
    { name: 'url', type: AssetFieldType.VARCHAR, required: true },
    { name: 'oidcAuthCodeCb', type: AssetFieldType.VARCHAR, required: false },
    { name: 'token', type: AssetFieldType.VARCHAR, required: true },
] as const satisfies readonly (AssetTypeField | AssetTypeRelationField)[];

const appScopeFields = [
    { name: 'name', type: AssetFieldType.VARCHAR, required: true },
    { name: 'description', type: AssetFieldType.TEXT, required: true },
    { name: 'public', type: AssetFieldType.BOOLEAN, required: true },
    {
        name: 'appUuids',
        type: AssetFieldType.RELATION,
        targetAssetType: 'App',
        referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
        allowMultiple: true,
        required: true,
    },
] as const satisfies readonly (AssetTypeField | AssetTypeRelationField)[];

const authorizationInstanceFields = [
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
] as const satisfies readonly (AssetTypeField | AssetTypeRelationField)[];

const authorizationChallengeFields = [
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
] as const satisfies readonly (AssetTypeField | AssetTypeRelationField)[];

const assetTypeFields = [
    { name: 'name', type: AssetFieldType.VARCHAR, required: true },
    { name: 'externalJoinKeys', type: AssetFieldType.VARCHAR, allowMultiple: true, required: true },
] as const satisfies readonly (AssetTypeField | AssetTypeRelationField)[];

const grantFields = [
    {
        name: 'accountUuid',
        type: AssetFieldType.RELATION,
        required: true,
        targetAssetType: 'Account',
        referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
    },
    { name: 'assetUuid', type: AssetFieldType.VARCHAR, required: false },
    {
        name: 'typeUuid',
        type: AssetFieldType.RELATION,
        targetAssetType: 'AssetType',
        required: false,
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
] as const satisfies readonly (AssetTypeField | AssetTypeRelationField)[];

const appAccessFields = [
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
] as const satisfies readonly (AssetTypeField | AssetTypeRelationField)[];

const permissionFields = [
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
        required: false,
        targetAssetType: 'AssetType',
        referentialIntegrityStrategy: RelationalIntegrityStrategy.CASCADE,
    },
    { name: 'permission', type: AssetFieldType.VARCHAR, required: true },
] as const satisfies readonly (AssetTypeField | AssetTypeRelationField)[];

type AccountBase = FieldsToObject<typeof accountFields>;
type SessionBase = FieldsToObject<typeof sessionFields>;
type AppBase = FieldsToObject<typeof appFields>;
type AppScopeBase = FieldsToObject<typeof appScopeFields>;
type AuthorizationInstanceBase = FieldsToObject<typeof authorizationInstanceFields>;
type AuthorizationChallengeBase = FieldsToObject<typeof authorizationChallengeFields>;
type AssetTypeBase = FieldsToObject<typeof assetTypeFields>;
type GrantBase = FieldsToObject<typeof grantFields, false>;
type AppAccessBase = FieldsToObject<typeof appAccessFields, false>;
type PermissionBase = FieldsToObject<typeof permissionFields, false>;

export const RegistryConfigs = {
    Account: accountFields,
    Session: sessionFields,
    App: appFields,
    AppScope: appScopeFields,
    AuthorizationInstance: authorizationInstanceFields,
    AuthorizationChallenge: authorizationChallengeFields,
    AssetType: assetTypeFields,
    Grant: grantFields,
    AppAccess: appAccessFields,
    Permission: permissionFields,
} as const;

type RegistryBases = {
    Account: AccountBase;
    Session: SessionBase;
    App: AppBase;
    AppScope: AppScopeBase;
    AuthorizationInstance: AuthorizationInstanceBase;
    AuthorizationChallenge: AuthorizationChallengeBase;
    AssetType: AssetTypeBase;
    Grant: GrantBase;
    AppAccess: AppAccessBase;
    Permission: PermissionBase;
};

export type Account = Prettify<Entity<'Account'>>;
export type Session = Prettify<Entity<'Session'>>;
export type App = Prettify<Entity<'App'>>;
export type AppScope = Prettify<Entity<'AppScope'>>;
export type AuthorizationInstance = Prettify<Entity<'AuthorizationInstance'>>;
export type AuthorizationChallenge = Prettify<Entity<'AuthorizationChallenge'>>;
export type AssetType = Prettify<Entity<'AssetType'>>;
export type Grant = Prettify<Entity<'Grant'>>;
export type AppAccess = Prettify<Entity<'AppAccess'>>;
export type Permission = Prettify<Entity<'Permission'>>;

// --------------------------------------------------------   Type Logic   -------------------------------------------------------------

export const getMappedFields = (
    mapping: Partial<FundamentalAssetTypeMapping>,
    fields: readonly (AssetTypeField | AssetTypeRelationField)[],
): (AssetTypeField | AssetTypeRelationField)[] => {
    return fields.map(field => {
        if (field.type === AssetFieldType.RELATION) {
            const relationField = field as AssetTypeRelationField;
            const targetAssetType = mapping[relationField.targetAssetType];
            if (!targetAssetType) {
                throw new Error(`Target asset type ${relationField.targetAssetType} not found in mapping`);
            }

            return {
                ...relationField,
                targetAssetType: convertTypeTableToUuid(targetAssetType),
            };
        }

        return {
            ...field,
        };
    });
};

type FieldToTs<T> = T extends AssetFieldType.VARCHAR | AssetFieldType.TEXT
    ? string
    : T extends AssetFieldType.INTEGER | AssetFieldType.FLOAT8
      ? number
      : T extends AssetFieldType.BOOLEAN
        ? boolean
        : T extends AssetFieldType.DATE
          ? Date
          : T extends AssetFieldType.RELATION
            ? string
            : never;

type FieldToValue<Field> = Field extends { type: infer T; allowMultiple: true }
    ? FieldToTs<T>[]
    : Field extends { type: infer T }
      ? FieldToTs<T>
      : never;

type FieldsToObject<F extends readonly any[], includeUuid extends boolean = true> = Prettify<
    (includeUuid extends true ? { uuid: string } : {}) & {
        [K in F[number] as K['required'] extends true ? K['name'] : never]: FieldToValue<K>;
    } & {
        [K in F[number] as K['required'] extends false ? K['name'] : never]?: FieldToValue<K>;
    }
>;

type Prettify<T> = { [K in keyof T]: T[K] } & {};

type StripRelationSuffix<Name extends string> = Name extends `${infer Base}Uuids`
    ? Base
    : Name extends `${infer Base}Ids`
      ? Base
      : Name extends `${infer Base}Uuid`
        ? Base
        : Name extends `${infer Base}Id`
          ? Base
          : Name;

type Pluralize<Name extends string> = Name extends `${string}s` ? Name : `${Name}s`;

type AutoRefName<Name extends string, AllowMultiple extends boolean> = AllowMultiple extends true
    ? Name extends `${infer Base}Uuids`
        ? Pluralize<Base>
        : Name extends `${infer Base}Ids`
          ? Pluralize<Base>
          : Pluralize<StripRelationSuffix<Name>>
    : StripRelationSuffix<Name>;

type RelationRefKey<
    EntityName extends string,
    FieldName extends string,
> = `${Uncapitalize<EntityName>}_${Pluralize<StripRelationSuffix<FieldName>>}`;

type AddAutoRefsByConfig<Fields extends readonly any[], Registry> = UnionToIntersection<
    Fields[number] extends infer Field
        ? Field extends { name: infer Name; type: AssetFieldType.RELATION; targetAssetType: infer Target }
            ? Name extends string
                ? Target extends keyof Registry
                    ? {
                          [P in `${AutoRefName<Name, Field extends { allowMultiple: true } ? true : false>}_ref`]?: Entity<Target & string>;
                      }
                    : {}
                : {}
            : {}
        : {}
>;

type ReverseRefsByConfig<Me extends string, Configs extends Record<string, readonly any[]>> = UnionToIntersection<
    {
        [K in keyof Configs]: Configs[K][number] extends infer Field
            ? Field extends { name: infer Name; type: AssetFieldType.RELATION; targetAssetType: infer Target }
                ? Target extends Me
                    ? Name extends string
                        ? { [P in RelationRefKey<string & K, Name>]?: Entity<string & K>[] }
                        : {}
                    : {}
                : {}
            : {};
    }[keyof Configs]
>;

type Entity<Name extends string> = RegistryBases[Name & keyof RegistryBases] &
    AddAutoRefsByConfig<(typeof RegistryConfigs)[Name & keyof typeof RegistryConfigs], RegistryBases> &
    ReverseRefsByConfig<Name, typeof RegistryConfigs>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

