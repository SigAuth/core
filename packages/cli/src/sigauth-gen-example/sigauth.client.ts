import { Account, App, AuthorizationChallenge, AuthorizationInstance, Mirror, Session } from './asset-types.js';
import { Utils } from './helper.functions.js';

type GlobalRealtionMap = Record<string, Record<string, string>>;

const TableIds = {
    Account: 'asset-46-484-6-4684245',
    Session: 'asset-84-684-68-4684245',
    Mirror: 'asset-486-484-64-4684245',
    App: 'asset-486-4842-6-4684245',
    AuthorizationInstance: 'asset-486-484-646-4684245',
    AuthorizationChallenge: 'asset-486-484-6468-4684245',
};

const Relations: GlobalRealtionMap = {
    [TableIds.Account]: {
        sessions: TableIds.Session,
    },
    [TableIds.Session]: {
        subject_account: TableIds.Account,
    },
    [TableIds.Mirror]: {},
    [TableIds.App]: {
        authorizationInstances: TableIds.AuthorizationInstance,
        authorizationChallenges: TableIds.AuthorizationChallenge,
    },
    [TableIds.AuthorizationInstance]: {
        session: TableIds.Session,
        app: TableIds.App,
    },
    [TableIds.AuthorizationChallenge]: {
        session: TableIds.Session,
        app: TableIds.App,
    },
};

export class SigauthClient {
    account = new Model<Account>(TableIds.Account);
    session = new Model<Session>(TableIds.Session);
    mirror = new Model<Mirror>(TableIds.Mirror);
    app = new Model<App>(TableIds.App);
    authorizationInstance = new Model<AuthorizationInstance>(TableIds.AuthorizationInstance);
    authorizationChallenge = new Model<AuthorizationChallenge>(TableIds.AuthorizationChallenge);
}

export class Model<T> {
    constructor(private tableName: string) {}

    // Q muss von Query<T> erben, um Inferenz zu ermöglichen
    async findOne<Q extends Omit<Query<T>, 'limit'>>(query: Q): Promise<Payload<T, Q> | null> {
        const qsString = Utils.simpleQs(this.parseQuery(query as any));
        console.log(qsString);

        const sql = Utils.toSQL(this.tableName, query, Relations);
        console.log(sql);

        return {} as any; // Dummy return für TypeScript
    }

    // Rückgabetyp ist ein Array aus dem berechneten Payload
    async findMany<Q extends Query<T>>(query: Q): Promise<Payload<T, Q>[]> {
        const qsString = Utils.simpleQs(this.parseQuery(query));
        console.log(qsString);

        const sql = Utils.toSQL(this.tableName, query, Relations);
        console.log(sql);
        // ...existing code...
        return [] as any;
    }

    private parseQuery(query: Query<T>) {
        // Hier baust du deine "where"-Logik um in ein Objekt, das qs.stringify versteht
        return query;
    }
}

// Define scalar types explicitly to filter them out of "includes"
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
