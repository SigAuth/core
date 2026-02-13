import { GenericDatabaseGateway } from '@/internal/database/generic/database.gateway';
import {
    AssetFieldType,
    AssetTypeRelationField,
    DefinitiveAssetType,
    INTERNAL_APP_ACCESS_TABLE,
    INTERNAL_ASSET_TYPE_TABLE,
    INTERNAL_GRANT_TABLE,
    INTERNAL_PERMISSION_TABLE,
} from '@sigauth/sdk/architecture';
import {
    Account,
    App,
    AppAccess,
    AppScope,
    AssetType,
    AuthorizationChallenge,
    AuthorizationInstance,
    getMappedFields,
    Grant,
    Permission,
    RegistryConfigs,
    Session,
} from '@sigauth/sdk/fundamentals';
import { AssetTypeTableMapping } from '@sigauth/sdk/protected';

export type GlobalRealtionMap = Record<
    string,
    Record<string, { table: string; joinType?: 'forward' | 'reverse'; fieldName: string; usingJoinTable?: boolean }>
>;

const stripRelationSuffix = (name: string) =>
    name
        .replace(/Uuids$/, '')
        .replace(/Ids$/, '')
        .replace(/Uuid$/, '')
        .replace(/Id$/, '');

const pluralize = (name: string) => (name.endsWith('s') ? name : `${name}s`);

const uncapitalize = (name: string) => (name ? name[0].toLowerCase() + name.slice(1) : name);

const autoRefName = (name: string, allowMultiple?: boolean) => {
    if (allowMultiple) {
        if (name.endsWith('Uuids')) return pluralize(name.replace(/Uuids$/, ''));
        if (name.endsWith('Ids')) return pluralize(name.replace(/Ids$/, ''));
        return pluralize(stripRelationSuffix(name));
    }
    return stripRelationSuffix(name);
};

// we need to dynamically generate this table so we can have the correct mapping for all asset types including custom ones

const buildTypeRelations = (assetTypes: DefinitiveAssetType[]): GlobalRealtionMap => {
    const map: GlobalRealtionMap = {};

    const tableName = (typeUuid: string) => (!typeUuid.startsWith('_internal') ? `asset_${typeUuid}` : typeUuid);
    for (const assetType of assetTypes) {
        const relations = assetType.fields.filter((f): f is AssetTypeRelationField => f.type === AssetFieldType.RELATION);
        for (const relation of relations) {
            const target = assetTypes.find(t => t.uuid === relation.targetAssetType);
            if (!target)
                throw new Error(
                    `Invalid relation in asset type ${assetType.name}: target asset type ${relation.targetAssetType} not found`,
                );

            if (!map[tableName(assetType.uuid)]) map[tableName(assetType.uuid)] = {};
            if (!map[tableName(relation.targetAssetType)]) map[tableName(relation.targetAssetType)] = {};

            // forward
            const forwardRefName = `${autoRefName(relation.name, relation.allowMultiple)}_ref`;
            map[tableName(assetType.uuid)][forwardRefName] = {
                joinType: 'forward',
                table: tableName(relation.targetAssetType),
                fieldName: relation.name,
                usingJoinTable: !!relation.allowMultiple,
            };

            // reverse
            const reverseFieldName = `${uncapitalize(assetType.name)}_${pluralize(stripRelationSuffix(relation.name))}`;
            map[tableName(relation.targetAssetType)][reverseFieldName] = {
                joinType: 'reverse',
                table: tableName(assetType.uuid),
                fieldName: relation.name,
                usingJoinTable: !!relation.allowMultiple,
            };
        }
    }

    return map;
};

export class SigauthClient {
    protected mapping?: AssetTypeTableMapping;
    protected client?: GenericDatabaseGateway;

    private relations?: GlobalRealtionMap;
    private models: Partial<Record<string, Model<any>>> = {};

    async init(client: GenericDatabaseGateway) {
        this.client = client;
        await this.refreshSchema();
    }

    async refreshSchema() {
        this.mapping = await this.client!.generateAssetTypeTableMapping(true);
        this.relations = await this.rebuildRelations();
    }

    private async rebuildRelations(): Promise<GlobalRealtionMap> {
        const assetTypes = (await this.client?.getAssetTypes()) ?? [];
        assetTypes.push({
            uuid: INTERNAL_ASSET_TYPE_TABLE,
            name: 'AssetType',
            fields: getMappedFields(this.mapping!, RegistryConfigs.AssetType),
        });

        assetTypes.push({
            uuid: INTERNAL_GRANT_TABLE,
            name: 'Grant',
            fields: getMappedFields(this.mapping!, RegistryConfigs.Grant),
        });

        assetTypes.push({
            uuid: INTERNAL_APP_ACCESS_TABLE,
            name: 'AppAccess',
            fields: getMappedFields(this.mapping!, RegistryConfigs.AppAccess),
        });

        assetTypes.push({
            uuid: INTERNAL_PERMISSION_TABLE,
            name: 'Permission',
            fields: getMappedFields(this.mapping!, RegistryConfigs.Permission),
        });

        return buildTypeRelations(assetTypes);
    }

    private ensureInitialized() {
        if (!this.mapping || !this.client || !this.relations) {
            throw new Error('SigauthClient not initialized. Call init() first.');
        }
    }

    public getModel<T extends Record<string, any>>(key: keyof AssetTypeTableMapping & string): Model<T> {
        this.ensureInitialized();
        if (!this.models[key]) {
            const ModelImpl = this.client?.modelClass;
            this.models[key] = new ModelImpl!(this.mapping![key], this.relations!, this.client!);
        }
        return this.models[key] as Model<T>;
    }

    get Account(): Model<Account> {
        return this.getModel<Account>('Account');
    }
    get Session(): Model<Session> {
        return this.getModel<Session>('Session');
    }
    get App(): Model<App> {
        return this.getModel<App>('App');
    }

    get AppScope(): Model<AppScope> {
        return this.getModel<AppScope>('AppScope');
    }

    get AuthorizationInstance(): Model<AuthorizationInstance> {
        return this.getModel<AuthorizationInstance>('AuthorizationInstance');
    }
    get AuthorizationChallenge(): Model<AuthorizationChallenge> {
        return this.getModel<AuthorizationChallenge>('AuthorizationChallenge');
    }

    // Internal
    get AssetType(): Model<AssetType> {
        return this.getModel<AssetType>('AssetType');
    }

    get Grant(): Model<Grant> {
        return this.getModel<Grant>('Grant');
    }

    get AppAccess(): Model<AppAccess> {
        return this.getModel<AppAccess>('AppAccess');
    }

    get Permission(): Model<Permission> {
        return this.getModel<Permission>('Permission');
    }

    get TableMapping() {
        return this.mapping!;
    }
}

export abstract class Model<T extends Record<string, any>> {
    public constructor(
        protected tableName: string,
        protected relations: GlobalRealtionMap,
        protected db: GenericDatabaseGateway,
    ) {}

    abstract findOne<const Q extends Omit<FindQuery<T>, 'limit'>>(
        query: Q & Exact<Omit<FindQuery<T>, 'limit'>, Q>,
    ): Promise<Payload<T, Q> | null>;

    abstract findMany<const Q extends FindQuery<T>>(query: Q & Exact<FindQuery<T>, Q>): Promise<Payload<T, Q>[]>;

    abstract createOne(input: CreateInput<T>): Promise<T>;
    abstract createMany(input: CreateManyInput<T>): Promise<T[]>;
    abstract updateOne(input: UpdateInput<T>): Promise<T>;
    abstract updateMany(input: UpdateInput<T>): Promise<T[]>;
    abstract deleteOne(input: DeleteInput<T>): Promise<T>;
    abstract deleteMany(input: DeleteInput<T>): Promise<T[]>;
}

type Scalar =
    | string
    | number
    | boolean
    | Date
    | symbol
    | null
    | undefined
    | readonly string[]
    | readonly number[]
    | readonly boolean[]
    | readonly Date[]
    | readonly symbol[];

export type Exact<Shape, Input extends Shape> = Shape & Record<Exclude<keyof Input, keyof Shape>, never>;

export type ScalarKeys<T> = {
    [K in keyof T]: NonNullable<T[K]> extends Scalar ? K : never;
}[keyof T];

export type Payload<T, Q extends FindQuery<T>> = Pick<T, ScalarKeys<T>> &
    (Q['includes'] extends object
        ? {
              [K in keyof Q['includes'] & keyof T]: NonNullable<T[K]> extends (infer U)[]
                  ? Payload<U, { includes: Q['includes'][K] }>[]
                  : NonNullable<T[K]> extends object
                    ? Payload<NonNullable<T[K]>, { includes: Q['includes'][K] }>
                    : never;
          }
        : {});

type FindIncludesShape<T> = {
    [K in keyof T as NonNullable<T[K]> extends (infer U)[] // 1. Unpack Arrays (e.g. Session[]) to check the inner type
        ? U extends Scalar
            ? never
            : K // If inner type is scalar, exclude key
        : NonNullable<T[K]> extends Scalar
          ? never
          : K]?: boolean | FindIncludesQuery<NonNullable<T[K]> extends (infer U)[] ? U : NonNullable<T[K]>>; // If type is scalar, exclude key
};

export type FindIncludesQuery<T> = FindIncludesShape<T>;

export type FindWhere<T> = Partial<{ [K in keyof T]: T[K] | { in?: T[K][]; lt?: T[K]; gt?: T[K] } }> & {
    AND?: FindWhere<T> | FindWhere<T>[];
    OR?: FindWhere<T> | FindWhere<T>[];
};

export type FindQuery<T> = {
    authorization?: {
        userUuid: string;
        scopes: string[];
        recursive?: boolean;
    };
    where?: FindWhere<T>;
    limit?: number;
    orderBy?: Partial<Record<keyof T, 'asc' | 'desc'>>;
    includes?: FindIncludesQuery<T>;
};

export type CreateManyInput<T> = Omit<CreateInput<T>, 'data'> & {
    data: CreateInput<T>['data'][];
};

export type CreateInput<T> = {
    data: CreateQuery<T>;
    select?: (keyof T)[];
};

export type CreateQuery<T> = Omit<Pick<T, ScalarKeys<T>>, 'uuid'>;

export type UpdateInput<T> = {
    where: FindWhere<T>;
    data: Partial<CreateQuery<T>>;
};

export type DeleteInput<T> = {
    where: FindWhere<T>;
};
