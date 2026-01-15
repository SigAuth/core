import { AssetFieldType, AssetType, AssetTypeField, AssetTypeRelationField } from '@sigauth/generics/asset';
import { InterfaceDeclarationStructure, OptionalKind, Project, PropertySignatureStructure, VariableDeclarationKind } from 'ts-morph';

export class TypeGenerator {
    private readonly assetTypes: AssetType[];
    private readonly outPath: string;
    private readonly project: Project;

    constructor(assetTypes: AssetType[], outPath: string = './src/sigauth') {
        this.assetTypes = assetTypes;
        this.outPath = outPath;
        this.project = new Project();
    }

    generate() {
        this.generateBaseTypeFile();
        this.generateClientFile();
        this.generateHelperFile();
    }

    private generateBaseTypeFile() {
        const baseTypeFile = this.project.createSourceFile(`${this.outPath}/asset-types.ts`, '', { overwrite: true });
        const interfaces: OptionalKind<InterfaceDeclarationStructure>[] = [];
        const reverseRelations: Record<string, OptionalKind<PropertySignatureStructure>[]> = {};

        // Initialize map
        this.assetTypes.forEach(t => (reverseRelations[t.uuid] = []));

        // Pre-calculate reverse relations
        for (const type of this.assetTypes) {
            for (const field of type.fields) {
                if (field.type === AssetFieldType.RELATION) {
                    const relationField = field as AssetTypeRelationField;
                    const fieldNameBase = field.name.replace(/(Id|UUID|Uuid|Identifier)$/i, '');
                    const reversePropName = `${fieldNameBase}_${type.name.toLowerCase()}s`;

                    relationField.relationTypeConstraint.forEach(targetUuid => {
                        if (reverseRelations[targetUuid]) {
                            reverseRelations[targetUuid].push({
                                name: reversePropName,
                                type: `${type.name}[]`,
                                hasQuestionToken: true,
                                docs: [`Reverse relation from ${type.name}.${field.name}`],
                            });
                        }
                    });
                }
            }
        }

        // todo add joinColumnNames
        for (const type of this.assetTypes) {
            const properties: OptionalKind<PropertySignatureStructure>[] = [];
            const referenceProperties: OptionalKind<PropertySignatureStructure>[] = [];

            for (const field of type.fields) {
                properties.push({
                    name: field.name,
                    type: this.mapFieldTypeToTsType(field, this.assetTypes),
                    hasQuestionToken: !field.required,
                });

                if (field.type === AssetFieldType.RELATION) {
                    const types = this.assetTypes.filter(t => (field as AssetTypeRelationField).relationTypeConstraint.includes(t.uuid));

                    // this field is only available when table is joined
                    let name = field.name.replace(/(Id|UUID|Uuid|Identifier)$/i, '');
                    if (types.length === 1 && !name.toLowerCase().includes(types[0].name.toLowerCase()))
                        name = name + '_' + types[0].name.toLowerCase();
                    else name = name + '_reference';

                    referenceProperties.push({
                        name,
                        type: types.map(t => t.name).join(' | '),
                        hasQuestionToken: true,
                        docs:
                            referenceProperties.length === 0
                                ? ['These fields are only available when the relation is included in the query']
                                : undefined,
                    });
                }
            }

            interfaces.push({
                name: type.name,
                isExported: true,
                properties: [...properties, ...referenceProperties, ...(reverseRelations[type.uuid] || [])],
            });
        }

        baseTypeFile.addInterfaces(interfaces);
        baseTypeFile.formatText();
        baseTypeFile.saveSync();
    }

    private generateHelperFile() {
        const helperFile = this.project.createSourceFile(`${this.outPath}/helper.ts`, '', { overwrite: true });

        helperFile.addStatements(`
import { Query } from './sigauth.client.js';

export const Utils = {
    simpleQs: (obj: Record<string, any>, prefix = ''): string => {
        const parts: string[] = [];
        for (const key in obj) {
            const value = obj[key];
            const param = prefix ? \`\${prefix}[\${key}]\` : key;
            if (typeof value === 'object' && value !== null) {
                parts.push(Utils.simpleQs(value, param));
            } else {
                parts.push(\`\${encodeURIComponent(param)}=\${encodeURIComponent(String(value))}\`);
            }
        }
        return parts.join('&');
    },

    toSQL: (table: string, query: Query<any>, relationMap: Record<string, Record<string, string>>) => {
        const conditions: string[] = [];
        const joins: string[] = [];
        const selections: string[] = [\`"\${table}".*\`];

        if (query.where) {
            for (const [key, value] of Object.entries(query.where)) {
                const col = \`"\${table}"."\${key}"\`;

                if (typeof value === 'object' && value !== null) {
                    if ('in' in value) {
                        const val = value as { in: any[] };
                        conditions.push(\`\${col} IN (\${val.in.map((v: any) => \`'\${v}'\`).join(',')})\`);
                    } else if ('lt' in value || 'gt' in value) {
                        const val = value as { lt?: any; gt?: any };
                        if (val.lt !== undefined) conditions.push(\`\${col} < '\${val.lt}'\`);
                        if (val.gt !== undefined) conditions.push(\`\${col} > '\${val.gt}'\`);
                    }
                } else {
                    conditions.push(\`\${col} = '\${value}'\`);
                }
            }
        }

        const processIncludes = (parentAlias: string, parentTableId: string, includes: any) => {
            for (const [relationName, options] of Object.entries(includes)) {
                if (!options) continue;

                const parentRelations = relationMap[parentTableId];

                if (!parentRelations) {
                    console.warn(\`Keine Relationen für Tabelle '\${parentTableId}' definiert.\`);
                    continue;
                }

                const targetTableId = parentRelations[relationName];
                if (!targetTableId) {
                    console.warn(\`Relation '\${relationName}' existiert nicht in Tabelle '\${parentTableId}'.\`);
                    continue;
                }

                const newAlias = parentAlias === table ? relationName : \`\${parentAlias}_\${relationName}\`;

                joins.push(
                    \`LEFT JOIN "\${targetTableId}" AS "\${newAlias}" ON "\${newAlias}"."\${parentTableId}_uuid" = "\${parentAlias}"."uuid"\`,
                );
                selections.push(\`"\${newAlias}".*\`);

                if (typeof options === 'object') {
                    processIncludes(newAlias, targetTableId, options);
                }
            }
        };

        if (query.includes) {
            processIncludes(table, table, query.includes);
        }

        const selectClause = \`SELECT \${selections.join(', ')} FROM "\${table}"\`;
        const joinClause = joins.length ? joins.join(' ') : '';
        const whereClause = conditions.length ? \`WHERE \${conditions.join(' AND ')}\` : '';
        const orderClause = query.orderBy
            ? 'ORDER BY ' +
              Object.entries(query.orderBy)
                  .map(([k, v]) => \`"\${table}"."\${k}" \${v!.toUpperCase()}\`)
                  .join(', ')
            : '';
        const limitClause = query.limit ? \`LIMIT \${query.limit}\` : '';

        return \`\${selectClause} \${joinClause} \${whereClause} \${orderClause} \${limitClause}\`.replace(/\\s+/g, ' ').trim();
    },
};
`);
        helperFile.formatText();
        helperFile.saveSync();
    }

    private generateClientFile() {
        const clientFile = this.project.createSourceFile(`${this.outPath}/sigauth.client.ts`, '', { overwrite: true });

        // 1. Imports
        const assetNames = this.assetTypes
            .map(t => t.name)
            .sort()
            .join(', ');
        clientFile.addStatements(`import { ${assetNames} } from './asset-types.js';`);
        clientFile.addStatements(`import { Utils } from './helper.js';`);

        // 2. TableIds Constant
        const tableIdsProps = this.assetTypes.map(t => `${t.name}: 'asset-${t.uuid}'`);
        clientFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: 'TableIds',
                    initializer: `{\n${tableIdsProps.join(',\n')}\n}`,
                },
            ],
        });

        // 3. Pre-calculate Relations Map
        const relationsData: Record<string, Record<string, string>> = {};
        this.assetTypes.forEach(t => (relationsData[t.uuid] = {}));

        for (const type of this.assetTypes) {
            for (const field of type.fields) {
                if (field.type === AssetFieldType.RELATION) {
                    const relationField = field as AssetTypeRelationField;
                    const targetUuids = relationField.relationTypeConstraint;

                    // --- Forward Relations (must match generateBaseTypeFile logic) ---
                    const types = this.assetTypes.filter(t => targetUuids.includes(t.uuid));
                    const forwardNameBase = field.name.replace(/(Id|UUID|Uuid|Identifier)$/i, '');
                    let forwardPropName = forwardNameBase;

                    if (types.length === 1 && !forwardNameBase.toLowerCase().includes(types[0].name.toLowerCase())) {
                        forwardPropName = forwardNameBase + '_' + types[0].name.toLowerCase();
                    } else {
                        forwardPropName = forwardNameBase + '_reference';
                    }

                    // Map forward relation (Assuming singular target for simplicity in generated client for now)
                    if (targetUuids.length > 0) {
                        relationsData[type.uuid][forwardPropName] = targetUuids[0];
                    }

                    // --- Reverse Relations (must match generateBaseTypeFile logic) ---
                    const reverseNameBase = field.name.replace(/(Id|UUID|Uuid|Identifier)$/i, '');
                    const reversePropName = `${reverseNameBase}_${type.name.toLowerCase()}s`;

                    targetUuids.forEach(targetUuid => {
                        if (relationsData[targetUuid]) {
                            relationsData[targetUuid][reversePropName] = type.uuid;
                        }
                    });
                }
            }
        }

        // 4. Generate Relations Constant String
        const relationsEntries = Object.entries(relationsData).map(([uuid, rels]) => {
            const type = this.assetTypes.find(t => t.uuid === uuid);
            // Use TableIds constant for key if possible
            const tableKey = type ? `[TableIds.${type.name}]` : `'${uuid}'`;

            const mappedRels = Object.entries(rels)
                .map(([k, v]) => {
                    const targetType = this.assetTypes.find(t => t.uuid === v);
                    // Use TableIds constant for value if possible
                    const targetVal = targetType ? `TableIds.${targetType.name}` : `'${v}'`;
                    return `${k}: ${targetVal}`;
                })
                .join(',\n');

            return `${tableKey}: {\n${mappedRels}\n}`;
        });

        clientFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: 'Relations',
                    type: 'Record<string, Record<string, string>>',
                    initializer: `{\n${relationsEntries.join(',\n')}\n}`,
                },
            ],
        });

        // 5. SigauthClient Class
        clientFile.addClass({
            name: 'SigauthClient',
            isExported: true,
            properties: this.assetTypes.map(t => ({
                name: t.name.charAt(0).toLowerCase() + t.name.slice(1),
                initializer: `new Model<${t.name}>(TableIds.${t.name})`,
            })),
        });

        // 6. Static Boilerplate (Model, Types)
        clientFile.addStatements(`
export class Model<T> {
    constructor(private tableName: string) {}

    async findOne<Q extends Omit<Query<T>, 'limit'>>(query: Q): Promise<Payload<T, Q> | null> {
        const qsString = Utils.simpleQs(query);
        const sql = Utils.toSQL(this.tableName, query, Relations);

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
`);

        clientFile.formatText();
        clientFile.saveSync();
    }

    private mapFieldTypeToTsType(field: AssetTypeField, allTypes: AssetType[]): string {
        switch (field.type) {
            case AssetFieldType.VARCHAR:
            case AssetFieldType.TEXT:
            case AssetFieldType.RELATION:
                return 'string';
            case AssetFieldType.INTEGER:
            case AssetFieldType.FLOAT8:
                return 'number';
            case AssetFieldType.BOOLEAN:
                return 'boolean';
            case AssetFieldType.DATE:
                return 'Date';
            case AssetFieldType.RELATION:

            default:
                return 'any';
        }
    }
}
