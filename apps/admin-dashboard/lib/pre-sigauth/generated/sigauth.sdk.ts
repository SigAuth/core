import { SigAuthVerifier } from '@/lib/pre-sigauth/generated/sigauth.verifier';
import { config as loadedConfig } from '@/sigauth.config';
import type { AssetTypeField, AssetTypeRelationField, JSONSerializable } from '@sigauth/sdk/architecture';
import type { SigAuthConfig } from '@sigauth/sdk/config';
import type { Account, App } from '@sigauth/sdk/fundamentals';
import { sigauthRequest } from '@sigauth/sdk/utils';

const asJsonBody = (value: unknown): JSONSerializable => value as JSONSerializable;

export class SigAuthSDK {
    private static instance: SigAuthSDK | null = null;

    private models: Partial<Record<string, Model<any>>> = {};
    private authVerifier?: SigAuthVerifier;

    readonly config: SigAuthConfig;

    private constructor(config: SigAuthConfig) {
        this.config = config;
        this.authVerifier = new SigAuthVerifier(config);
    }

    static getInstance(): SigAuthSDK {
        if (!SigAuthSDK.instance) {
            SigAuthSDK.instance = new SigAuthSDK(loadedConfig);
        }
        return SigAuthSDK.instance;
    }

    async createAssetType(name: string, fields: AssetTypeField[], internalAccountAuthorization: boolean = true) {
        const request = await sigauthRequest('POST', '/api/asset-type/create', {
            body: asJsonBody({ name, fields }),
            config: this.config,
            internalAuthorization: internalAccountAuthorization,
        });

        if (request.ok) {
            return request.json();
        } else {
            throw new Error(`Failed to create asset type: ${request.status} ${request.statusText}`);
        }
    }

    async editAssetType(
        uuid: string,
        updatedName: string | undefined,
        updatedFields: ((AssetTypeField | AssetTypeRelationField) & { originalName?: string })[],
        internalAccountAuthorization: boolean = true,
    ) {
        const request = await sigauthRequest('POST', '/api/asset-type/edit', {
            body: asJsonBody({ uuid, updatedName, updatedFields }),
            config: this.config,
            internalAuthorization: internalAccountAuthorization,
        });

        if (request.ok) {
            return request.json();
        } else {
            throw new Error(`Failed to edit asset type: ${request.status} ${request.statusText}`);
        }
    }

    async deleteAssetTypes(uuids: string[], internalAccountAuthorization: boolean = true) {
        const request = await sigauthRequest('POST', '/api/asset-type/delete', {
            body: asJsonBody({ assetTypeUuids: uuids }),
            config: this.config,
            internalAuthorization: internalAccountAuthorization,
        });

        if (request.ok) {
            return;
        } else {
            throw new Error(`Failed to delete asset type: ${request.status} ${request.statusText}`);
        }
    }

    private getModel<T extends object>(key: 'Account' | 'App', Type: new (typeUuid: string, config: SigAuthConfig) => Model<T>): Model<T> {
        if (!this.models[key]) {
            const typeUuid = this.getAssetTypeByName(key);
            if (!typeUuid) throw new Error(`Asset type with name ${key} not found`);
            this.models[key] = new Type(typeUuid, this.config);
        }
        return this.models[key] as Model<T>;
    }

    private getAssetTypeByName(name: string): string | null {
        const assetTypes: { uuid: string; name: string }[] = [
            { uuid: '019c4d17-df86-71d2-9c99-bd9fdc1c461c', name: 'Account' },
            { uuid: '019c4d17-e048-7fdc-bd9d-113a1a49eaa0', name: 'App' },
        ];
        return assetTypes.find(t => t.name === name)?.uuid || null;
    }

    get Account(): Model<Account> {
        return this.getModel<Account>('Account', Model);
    }

    get App(): Model<App> {
        return this.getModel<App>('App', Model);
    }

    get verifier(): SigAuthVerifier {
        return this.authVerifier!;
    }
}

export class Model<T extends Record<string, any>> {
    private typeUuid: string;
    private config: SigAuthConfig;

    constructor(typeUuid: string, config: SigAuthConfig) {
        this.typeUuid = typeUuid;
        this.config = config;
    }

    async find<Q extends FindQuery<T>>(query: Q): Promise<Payload<T, Q>[]> {
        const res = await sigauthRequest(
            'POST',
            `/api/asset/find?type=${this.typeUuid}&query=${encodeURIComponent(JSON.stringify(query))}`,
            {
                body: asJsonBody({
                    type: this.typeUuid,
                    query,
                }),
                config: this.config,
                internalAuthorization: query.internalAuthorization,
            },
        );

        const data = await res.json();
        if (res.ok) {
            return data as any as Payload<T, Q>[];
        } else {
            console.error(`DATA:`, data);
            throw new Error(`Failed to fetch asset: ${res.status} ${res.statusText}`);
        }
    }

    async createOne(input: CreateInput<T>): Promise<T> {
        const res = await sigauthRequest('POST', '/api/asset/createOne', {
            body: asJsonBody({
                type: this.typeUuid,
                query: input,
            }),
            config: this.config,
            internalAuthorization: input.internalAuthorization,
        });
        if (res.ok) {
            return res.json() as any as T;
        } else {
            throw new Error(`Failed to createOne the asset: ${res.status} ${res.statusText}`);
        }
    }

    async createMany(input: CreateManyInput<T>): Promise<T[]> {
        const res = await sigauthRequest('POST', '/api/asset/createMany', {
            body: asJsonBody({
                type: this.typeUuid,
                query: input,
            }),
            config: this.config,
            internalAuthorization: input.internalAuthorization,
        });
        if (res.ok) {
            return res.json() as any as T[];
        } else {
            throw new Error(`Failed to createMany the asset: ${res.status} ${res.statusText}`);
        }
    }

    async updateOne(input: UpdateInput<T>): Promise<T> {
        const res = await sigauthRequest('POST', '/api/asset/updateOne', {
            body: asJsonBody({
                type: this.typeUuid,
                query: input,
            }),
            config: this.config,
            internalAuthorization: input.internalAuthorization,
        });
        if (res.ok) {
            return res.json() as any as T;
        } else {
            throw new Error(`Failed to updateOne the asset: ${res.status} ${res.statusText}`);
        }
    }

    async updateMany(input: UpdateInput<T>): Promise<T[]> {
        const res = await sigauthRequest('POST', '/api/asset/updateMany', {
            body: asJsonBody({
                type: this.typeUuid,
                query: input,
            }),
            config: this.config,
            internalAuthorization: input.internalAuthorization,
        });
        if (res.ok) {
            return res.json() as any as T[];
        } else {
            throw new Error(`Failed to createMany the asset: ${res.status} ${res.statusText}`);
        }
    }

    async deleteOne(input: DeleteInput<T>): Promise<T> {
        const res = await sigauthRequest('POST', '/api/asset/deleteOne', {
            body: asJsonBody({
                type: this.typeUuid,
                query: input,
            }),
            config: this.config,
            internalAuthorization: input.internalAuthorization,
        });
        if (res.ok) {
            return res.json() as any as T;
        } else {
            throw new Error(`Failed to deleteOne the asset: ${res.status} ${res.statusText}`);
        }
    }

    async deleteMany(input: DeleteInput<T>): Promise<T[]> {
        const res = await sigauthRequest('POST', '/api/asset/deleteMany', {
            body: asJsonBody({
                type: this.typeUuid,
                query: input,
            }),
            config: this.config,
            internalAuthorization: input.internalAuthorization,
        });
        if (res.ok) {
            return res.json() as any as T[];
        } else {
            throw new Error(`Failed to deleteMany the asset: ${res.status} ${res.statusText}`);
        }
    }
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

export type FindIncludesQuery<T> = {
    [K in keyof T as NonNullable<T[K]> extends (infer U)[] // 1. Unpack Arrays (e.g. Session[]) to check the inner type
        ? U extends Scalar
            ? never
            : K // If inner type is scalar, exclude key
        : NonNullable<T[K]> extends Scalar
          ? never
          : K]?: boolean | FindIncludesQuery<NonNullable<T[K]> extends (infer U)[] ? U : NonNullable<T[K]>>; // If type is scalar, exclude key
};

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
    internalAuthorization?: boolean;
    orderBy?: Partial<Record<keyof T, 'asc' | 'desc'>>;
    includes?: FindIncludesQuery<T>;
};

export type CreateManyInput<T> = Omit<CreateInput<T>, 'data'> & {
    data: CreateInput<T>['data'][];
};

export type CreateInput<T> = {
    data: CreateQuery<T>;
    select?: (keyof T)[];
    internalAuthorization?: boolean;
};

export type CreateQuery<T> = Omit<Pick<T, ScalarKeys<T>>, 'uuid'>;

export type UpdateInput<T> = {
    where: FindWhere<T>;
    data: Partial<CreateQuery<T>>;
    internalAuthorization?: boolean;
};

export type DeleteInput<T> = {
    where: FindWhere<T>;
    internalAuthorization?: boolean;
};

