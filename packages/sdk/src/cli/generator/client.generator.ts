import { Project, Scope } from 'ts-morph';
import { AssetType } from '../../asset-type.architecture.js';
import { AccessableFundamentals, FundamentalAssetTypes } from '../../protected.types.js';

export const generateClient = (project: Project, assetTypes: AssetType[], outPath: string) => {
    const clientFile = project.createSourceFile(`${outPath}/sigauth.client.ts`, '', { overwrite: true });

    assetTypes = assetTypes.filter(
        t => !(FundamentalAssetTypes.includes(t.name as any) && !AccessableFundamentals.includes(t.name as any)),
    );
    const assetNames = assetTypes
        .map(t => t.name)
        .filter(name => !FundamentalAssetTypes.includes(name as any))
        .join(', ');

    clientFile.addStatements(`import { ${assetNames} } from './asset-types';`);
    clientFile.addStatements(`import type { ${AccessableFundamentals.join(', ')} } from '@sigauth/sdk/fundamentals';`);
    clientFile.addStatements(`import type { SigAuthConfig } from '@sigauth/sdk/config';`);
    clientFile.addStatements(`import { sigauthRequest } from '@sigauth/sdk/utils';`);
    clientFile.addStatements(`import type { AssetTypeField, AssetTypeRelationField } from '@sigauth/sdk/architecture';`);

    // SigAuth Client class
    const clientClass = clientFile.addClass({
        name: 'SigAuthSDK',
        isExported: true,
    });

    clientClass.addProperties([{ name: 'models', type: 'Partial<Record<string, Model<any>>>', initializer: '{}', scope: Scope.Private }]);
    clientClass.addProperties([{ name: 'config', type: 'SigAuthConfig', isReadonly: true }]);
    clientClass.addConstructor({
        parameters: [{ name: 'config', type: 'SigAuthConfig' }],
        statements: `this.config = config;`,
    });

    // createAssetType
    clientClass.addMethod({
        name: 'createAssetType',
        isAsync: true,
        parameters: [
            { name: 'name', type: 'string' },
            { name: 'fields', type: 'AssetTypeField[] ' },
            { name: 'internalAccountAuthorization', type: 'boolean', initializer: 'true' },
        ],
        statements: `
            const request = await sigauthRequest("POST", "/api/asset-type/create", { 
                body: { name, fields },
                config: this.config,
                internalAuthorization: internalAccountAuthorization
            });

            if (request.ok) {
                return request.json();
            } else {
                throw new Error(\`Failed to create asset type: \${request.status} \${request.statusText}\`);
            }
        `,
    });

    // editAssetType
    clientClass.addMethod({
        name: 'editAssetType',
        isAsync: true,
        parameters: [
            { name: 'uuid', type: 'string' },
            { name: 'updatedName', type: 'string | undefined' },
            { name: 'updatedFields', type: '((AssetTypeField | AssetTypeRelationField) & { originalName?: string })[]' },
            { name: 'internalAccountAuthorization', type: 'boolean', initializer: 'true' },
        ],
        statements: `
            const request = await sigauthRequest("POST", "/api/asset-type/edit", { 
                body: { uuid, updatedName, updatedFields },
                config: this.config,
                internalAuthorization: internalAccountAuthorization
            });

            if (request.ok) {
                return request.json();
            } else {
                throw new Error(\`Failed to edit asset type: \${request.status} \${request.statusText}\`);
            }
        `,
    });

    // deleteAssetTypes
    clientClass.addMethod({
        name: 'deleteAssetTypes',
        isAsync: true,
        parameters: [
            { name: 'uuids', type: 'string[]' },
            { name: 'internalAccountAuthorization', type: 'boolean', initializer: 'true' },
        ],
        statements: `
            const request = await sigauthRequest("POST", "/api/asset-type/delete", { 
                body: { assetTypeUuids: uuids },
                config: this.config,
                internalAuthorization: internalAccountAuthorization
            });

            if (request.ok) {
                return;
            } else {
                throw new Error(\`Failed to delete asset type: \${request.status} \${request.statusText}\`);
            }
        `,
    });

    clientClass.addMethod({
        name: 'getModel<T extends object>',
        parameters: [
            { name: 'key', type: assetTypes.map(t => `'${t.name}'`).join(' | ') },
            { name: 'Type', type: 'new (typeUuid: string, config: SigAuthConfig) => Model<T>' },
        ],
        returnType: 'Model<T>',
        scope: Scope.Private,
        statements: `
            if (!this.models[key]) {
                const typeUuid = this.getAssetTypeByName(key);
                if (!typeUuid) throw new Error(\`Asset type with name \${key} not found\`);
                this.models[key] = new Type(typeUuid, this.config);
            }
            return this.models[key] as Model<T>;
        `,
    });

    clientClass.addMethod({
        name: 'getAssetTypeByName',
        parameters: [{ name: 'name', type: 'string' }],
        returnType: 'string | null',
        scope: Scope.Private,
        statements: `
            const assetTypes: { uuid: string; name: string }[] = [${assetTypes.map(t => `{ uuid: '${t.uuid}', name: '${t.name}' }`).join(', ')}];
            return assetTypes.find(t => t.name === name)?.uuid || null;
        `,
    });

    clientClass.addGetAccessors(
        assetTypes.map(t => ({
            name: t.name, // Hier NUR den Namen, ohne "get"
            returnType: `Model<${t.name}>`,
            statements: `return this.getModel<${t.name}>('${t.name}', Model);`,
        })),
    );

    // Model class
    clientFile.addStatements(`
        export class Model<T extends Record<string, any>> {
            private typeUuid: string;
            private config: SigAuthConfig;

            constructor(typeUuid: string, config: SigAuthConfig) {
                this.typeUuid = typeUuid;
                this.config = config;    
            }

            async find<Q extends FindQuery<T>>(query: Q): Promise<Payload<T, Q>[]> {
                const res = await sigauthRequest("GET", \`/api/asset/find?type=\${this.typeUuid}&query=\${encodeURIComponent(JSON.stringify(query))}\`, {
                    config: this.config,
                    internalAuthorization: query.internalAuthorization,
                })
                if (res.ok) {
                    return res.json() as any as Payload<T, Q>[];
                } else {
                    throw new Error(\`Failed to fetch asset: \${res.status} \${res.statusText}\`);
                }
            }

            async createOne(input: CreateInput<T>): Promise<T> {
                return {} as T;
            }

            async createMany(input: CreateManyInput<T>): Promise<T[]> {
                return [] as T[];
            }

            async updateOne(input: UpdateInput<T>): Promise<T> {
                return {} as T;
            }

            async updateMany(input: UpdateInput<T>): Promise<T[]> {
                return [] as T[];
            }

            async deleteOne(input: DeleteInput<T>): Promise<T> {
                return {} as T;
            }

            async deleteMany(input: DeleteInput<T>): Promise<T[]> {
                return [] as T[];
            }
        }    
    `);

    // Type utitilies
    clientFile.addStatements(`
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
    `);

    clientFile.formatText();
    clientFile.saveSync();
};

