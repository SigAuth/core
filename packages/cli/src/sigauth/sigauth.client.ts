import { Account, App, AuthorizationChallenge, AuthorizationInstance, Mirror, Session } from './asset-types.js';
import { Utils } from './helper.js';

export type GlobalRealtionMap = Record<
    string,
    Record<string, { table: string; joinType?: 'forward' | 'reverse'; fieldName: string; usingJoinTable?: boolean }>
>;

const TableIds = {
    Account: 'asset_019bc17c_6001_7377_ae5c_a216d8b7b81a',
    Session: 'asset_019bc17c_6054_7bfd_8976_b34a2df8a62b',
    App: 'asset_019bc17c_60d1_7c4f_8bd3_9bb3753969f4',
    Mirror: 'asset_019bc17c_6120_745c_b566_cd34f1c5e352',
    AuthorizationInstance: 'asset_019bc17c_61b1_75f8_87da_e8bcf25b59c9',
    AuthorizationChallenge: 'asset_019bc17c_6238_79e6_8f8e_78a6d79ad63c'
};
const Relations: GlobalRealtionMap = {
    [TableIds.Account]: {
        subject_sessions: { table: TableIds.Session, joinType: 'reverse', fieldName: 'subjectUuid' },
        owner_mirrors: { table: TableIds.Mirror, joinType: 'reverse', fieldName: 'ownerUuids', usingJoinTable: true }
    },
    [TableIds.Session]: {
        subject_account: { table: TableIds.Account, joinType: 'forward', fieldName: 'subjectUuid' },
        session_authorizationinstances: { table: TableIds.AuthorizationInstance, joinType: 'reverse', fieldName: 'sessionUuid' },
        session_authorizationchallenges: { table: TableIds.AuthorizationChallenge, joinType: 'reverse', fieldName: 'sessionUuid' }
    },
    [TableIds.App]: {
        app_authorizationinstances: { table: TableIds.AuthorizationInstance, joinType: 'reverse', fieldName: 'appUuid' },
        app_authorizationchallenges: { table: TableIds.AuthorizationChallenge, joinType: 'reverse', fieldName: 'appUuid' }
    },
    [TableIds.Mirror]: {
        owner_accounts: { table: TableIds.Account, joinType: 'forward', fieldName: 'ownerUuids', usingJoinTable: true }
    },
    [TableIds.AuthorizationInstance]: {
        session_reference: { table: TableIds.Session, joinType: 'forward', fieldName: 'sessionUuid' },
        app_reference: { table: TableIds.App, joinType: 'forward', fieldName: 'appUuid' }
    },
    [TableIds.AuthorizationChallenge]: {
        session_reference: { table: TableIds.Session, joinType: 'forward', fieldName: 'sessionUuid' },
        app_reference: { table: TableIds.App, joinType: 'forward', fieldName: 'appUuid' }
    }
};

export class SigauthClient {
    account = new Model<Account>(TableIds.Account);
    session = new Model<Session>(TableIds.Session);
    app = new Model<App>(TableIds.App);
    mirror = new Model<Mirror>(TableIds.Mirror);
    authorizationInstance = new Model<AuthorizationInstance>(TableIds.AuthorizationInstance);
    authorizationChallenge = new Model<AuthorizationChallenge>(TableIds.AuthorizationChallenge);
}

export class Model<T> {
    constructor(private tableName: string) { }

    async findOne<Q extends Omit<Query<T>, 'limit'>>(query: Q): Promise<Payload<T, Q> | null> {
        const qsString = Utils.simpleQs(query);
        const sql = Utils.toSQL(this.tableName, query, Relations);

        console.log(sql);
        return {} as any;
    }

    async findMany<Q extends Query<T>>(query: Q): Promise<Payload<T, Q>[]> {
        const qsString = Utils.simpleQs(query);
        const sql = Utils.toSQL(this.tableName, query, Relations);

        return [] as any;
    }
}

type Scalar = string | number | boolean | Date | symbol | null | undefined;

type ScalarKeys<T> = {
    [K in keyof T]: NonNullable<T[K]> extends Scalar ? K : never;
}[keyof T];

export type Payload<T, Q extends Query<T>> = Pick<T, ScalarKeys<T>> &
    (Q['includes'] extends object
        ? {
            [K in keyof Q['includes'] & keyof T]: NonNullable<T[K]> extends (infer U)[]
            ? Payload<U, { includes: Q['includes'][K] }>[]
            : NonNullable<T[K]> extends object
            ? Payload<NonNullable<T[K]>, { includes: Q['includes'][K] }>
            : never;
        }
        : {});

export type IncludeQuery<T> = {
    [K in keyof T as NonNullable<T[K]> extends (infer U)[] // 1. Unpack Arrays (e.g. Session[]) to check the inner type
    ? U extends Scalar
    ? never
    : K // If inner type is scalar, exclude key
    : NonNullable<T[K]> extends Scalar
    ? never
    : K]?: boolean | IncludeQuery<NonNullable<T[K]> extends (infer U)[] ? U : NonNullable<T[K]>>; // If type is scalar, exclude key
};

export type Query<T> = {
    authorization?: {
        userId: string;
        scopes: string[];
        recursive?: boolean;
    };
    where?: Partial<{ [K in keyof T]: T[K] | { in?: T[K][]; lt?: T[K]; gt?: T[K] } }>;
    limit?: number;
    orderBy?: Partial<Record<keyof T, 'asc' | 'desc'>>;
    includes?: IncludeQuery<T>;
};

