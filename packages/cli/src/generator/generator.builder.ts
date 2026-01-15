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
                    const targetType = this.assetTypes.find(t => t.uuid === relationField.targetAssetType);

                    if (targetType) {
                        const fieldNameBase = field.name.replace(/(Id|UUID|Uuid|Identifier)$/i, '');
                        const reversePropName = `${fieldNameBase}_${type.name.toLowerCase()}s`;

                        if (reverseRelations[relationField.targetAssetType]) {
                            reverseRelations[relationField.targetAssetType].push({
                                name: reversePropName,
                                type: `${type.name}[]`,
                                hasQuestionToken: true,
                                docs: [`Reverse relation from ${type.name}.${field.name}`],
                            });
                        }
                    }
                }
            }
        }

        for (const type of this.assetTypes) {
            const properties: OptionalKind<PropertySignatureStructure>[] = [];
            const referenceProperties: OptionalKind<PropertySignatureStructure>[] = [];

            for (const field of type.fields) {
                properties.push({
                    name: field.name,
                    type: this.mapFieldTypeToTsType(field) + (field.allowMultiple ? '[]' : ''),
                    hasQuestionToken: !field.required,
                });

                if (field.type === AssetFieldType.RELATION) {
                    const targetType = this.assetTypes.find(t => (field as AssetTypeRelationField).targetAssetType === t.uuid);
                    if (!targetType) continue;

                    // this field is only available when table is joined
                    let name = field.name.replace(/(Ids?|Uuids?|Identifiers?)$/i, '');
                    if (!name.toLowerCase().includes(targetType.name.toLowerCase())) name = name + '_' + targetType.name.toLowerCase();
                    else name = name + '_reference';

                    if (field.allowMultiple) name += 's';

                    referenceProperties.push({
                        name,
                        type: targetType.name + (field.allowMultiple ? '[]' : ''),
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
import { GlobalRealtionMap, FindQuery } from './sigauth.client.js';

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

    toSQL: (table: string, query: FindQuery<any>, relationMap: GlobalRealtionMap) => {
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

        const getShortId = (fullId: string) =>
            fullId
                .replace(/^asset[-_]/, '')
                .replace(/[-_]/g, '')
                .substring(0, 16);

        const processIncludes = (parentAlias: string, parentTableId: string, includes: any) => {
            for (const [relationName, options] of Object.entries(includes)) {
                if (!options) continue;

                const parentRelations = relationMap[parentTableId];

                if (!parentRelations) {
                    console.warn(\`No relations found for table ID '\${parentTableId}'.\`);
                    continue;
                }

                const relationConfig = parentRelations[relationName];
                if (!relationConfig) {
                    console.warn(\`Relation '\${relationName}' does not exist in table '\${parentTableId}'.\`);
                    continue;
                }

                const { table: targetTableId, joinType = 'forward', fieldName, usingJoinTable } = relationConfig;

                const newAlias = parentAlias === table ? relationName : \`\${parentAlias}_\${relationName}\`;

                if (usingJoinTable) {
                    // Handling N:M via Join Tables (rel_SOURCE16_TARGET16)
                    const parentHex = getShortId(parentTableId);
                    const targetHex = getShortId(targetTableId);
                    const relAlias = \`rel_\${newAlias}\`;

                    if (joinType === 'forward') {
                        // Forward with JoinTable: Parent is Source, Target is Target.
                        // Join Table Name: rel_Parent_Target
                        // Logic: Parent.uuid -> JoinTable.source AND JoinTable.target -> Target.uuid
                        const joinTableName = \`rel_\${parentHex}_\${targetHex}\`;

                        joins.push(
                            \`LEFT JOIN "\${joinTableName}" AS "\${relAlias}" ON "\${relAlias}"."source" = "\${parentAlias}"."uuid" AND "\${relAlias}"."field" = '\${fieldName}'\`,
                        );
                        joins.push(\`LEFT JOIN "\${targetTableId}" AS "\${newAlias}" ON "\${newAlias}"."uuid" = "\${relAlias}"."target"\`);
                    } else {
                        // Reverse with JoinTable: Parent is Target, Target (in config) is Source.
                        // Join Table Name: rel_Target_Parent (Join table is always named Source_Target)
                        // Logic: Parent.uuid -> JoinTable.target AND JoinTable.source -> Target.uuid
                        const joinTableName = \`rel_\${targetHex}_\${parentHex}\`;

                        joins.push(
                            \`LEFT JOIN "\${joinTableName}" AS "\${relAlias}" ON "\${relAlias}"."target" = "\${parentAlias}"."uuid" AND "\${relAlias}"."field" = '\${fieldName}'\`,
                        );
                        joins.push(\`LEFT JOIN "\${targetTableId}" AS "\${newAlias}" ON "\${newAlias}"."uuid" = "\${relAlias}"."source"\`);
                    }
                } else {
                    // Direct 1:N or 1:1 Join
                    if (joinType === 'forward') {
                        // Forward: Custom Field points to UUID (Parent.customField -> Target.uuid)
                        // This side (Parent) holds the FK.
                        joins.push(
                            \`LEFT JOIN "\${targetTableId}" AS "\${newAlias}" ON "\${newAlias}"."uuid" = "\${parentAlias}"."\${fieldName}"\`,
                        );
                    } else {
                        // Reverse: UUID points to Custom Field (Parent.uuid -> Target.customField)
                        // The other side (Target) holds the FK.
                        joins.push(
                            \`LEFT JOIN "\${targetTableId}" AS "\${newAlias}" ON "\${newAlias}"."\${fieldName}" = "\${parentAlias}"."uuid"\`,
                        );
                    }
                }

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

        // Type Definition
        clientFile.addStatements(`
export type GlobalRealtionMap = Record<
    string,
    Record<string, { table: string; joinType?: 'forward' | 'reverse'; fieldName: string; usingJoinTable?: boolean }>
>;`);

        // 2. TableIds Constant
        const tableIdsProps = this.assetTypes.map(t => `${t.name}: 'asset_${t.uuid.replaceAll('-', '_')}'`);
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
        type RelationConfig = { table: string; joinType: 'forward' | 'reverse'; fieldName: string; usingJoinTable?: boolean };
        const relationsData: Record<string, Record<string, RelationConfig>> = {};
        this.assetTypes.forEach(t => (relationsData[t.uuid] = {}));

        for (const type of this.assetTypes) {
            for (const field of type.fields) {
                if (field.type === AssetFieldType.RELATION) {
                    const relationField = field as AssetTypeRelationField;
                    const targetUuid = relationField.targetAssetType;
                    const targetType = this.assetTypes.find(t => targetUuid === t.uuid);
                    if (!targetType) continue;

                    const isJoinTable = !!relationField.allowMultiple;

                    // --- Forward Relations (On Source Type) ---
                    const forwardNameBase = field.name.replace(/(Ids?|Uuids?|Identifiers?)$/i, '');
                    let forwardPropName = forwardNameBase;

                    if (!forwardNameBase.toLowerCase().includes(targetType.name.toLowerCase()))
                        forwardPropName = forwardNameBase + '_' + targetType.name.toLowerCase();
                    else forwardPropName = forwardNameBase + '_reference';
                    if (field.allowMultiple) forwardPropName += 's';

                    relationsData[type.uuid][forwardPropName] = {
                        table: `TableIds.${targetType.name}`,
                        joinType: 'forward',
                        fieldName: field.name,
                        usingJoinTable: isJoinTable || undefined,
                    };

                    // --- Reverse Relations (On Target Type) ---
                    const reverseNameBase = field.name.replace(/(Ids?|Uuids?|Identifiers?)$/i, '');
                    const reversePropName = `${reverseNameBase}_${type.name.toLowerCase()}s`;

                    if (relationsData[targetUuid]) {
                        relationsData[targetUuid][reversePropName] = {
                            table: `TableIds.${type.name}`,
                            joinType: 'reverse',
                            fieldName: field.name,
                            usingJoinTable: isJoinTable || undefined,
                        };
                    }
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
                    const props = [];
                    props.push(`table: ${v.table}`);
                    props.push(`joinType: '${v.joinType}'`);
                    props.push(`fieldName: '${v.fieldName}'`);
                    if (v.usingJoinTable) props.push(`usingJoinTable: true`);
                    return `${k}: { ${props.join(', ')} }`;
                })
                .join(',\n');

            return `${tableKey}: {\n${mappedRels}\n}`;
        });

        clientFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: 'Relations',
                    type: 'GlobalRealtionMap',
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
export class Model<T extends Record<string, any>> {
    constructor(private tableName: string) {}

    async findOne<Q extends Omit<FindQuery<T>, 'limit'>>(query: Q): Promise<Payload<T, Q> | null> {
        const qsString = Utils.simpleQs(query);
        const sql = Utils.toSQL(this.tableName, query, Relations);

        console.log(sql);
        return {} as any;
    }

    async findMany<Q extends FindQuery<T>>(query: Q): Promise<Payload<T, Q>[]> {
        const qsString = Utils.simpleQs(query);
        const sql = Utils.toSQL(this.tableName, query, Relations);

        return [] as any;
    }

    private getShortId(fullId: string) {
        return fullId
            .replace(/^asset[-_]/, '')
            .replace(/[-_]/g, '')
            .substring(0, 16);
    }

    async create(input: CreateInput<T>): Promise<T> {
        const cleanData = { ...input.data };
        const relationConfigs = Relations[this.tableName] || {};
        const joinTableInserts: string[] = [];
        const finalSelectJoins: string[] = [];
        const finalSelectColumns: string[] = ['i.*'];

        // 1. Identify and separate join table fields
        for (const key of Object.keys(input.data)) {
            const entry = Object.entries(relationConfigs).find(([, c]) => c.fieldName === key && c.usingJoinTable);

            if (entry) {
                const [relName, relConfig] = entry;

                // Remove from main insert payload
                delete cleanData[key as keyof typeof cleanData];

                const thisShort = this.getShortId(this.tableName);
                const otherShort = this.getShortId(relConfig.table);
                const value = input.data[key as keyof CreateQuery<T>];

                // Format value (handles arrays -> ARRAY['a','b'] or scalars)
                const formattedValue = this.formatValue(value);
                const valueSelect = Array.isArray(value) ? \`unnest(\${formattedValue})\` : formattedValue;

                let joinTableName: string;
                let selectStmt: string;

                // Aliases for the final select
                const relAlias = \`rel_\${relName}\`;
                const targetAlias = relName; // e.g. owner_accounts

                // Explicitly cast the value to UUID for the join table
                const castValueSelect = \`\${valueSelect}::uuid\`;

                if (relConfig.joinType === 'forward') {
                    // Forward: SOURCE (Me) -> TARGET (Value)
                    // JoinTable: rel_Me_Other
                    joinTableName = \`rel_\${thisShort}_\${otherShort}\`;
                    selectStmt = \`SELECT "uuid", \${castValueSelect}, '\${relConfig.fieldName}' FROM inserted\`;

                    // Join logic for SELECT: From i (Me) -> JoinTable.source, JoinTable.target -> Target
                    finalSelectJoins.push(
                        \`LEFT JOIN "\${joinTableName}" AS "\${relAlias}" ON "\${relAlias}"."source" = i."uuid" AND "\${relAlias}"."field" = '\${relConfig.fieldName}'\`,
                    );
                    finalSelectJoins.push(
                        \`LEFT JOIN "\${relConfig.table}" AS "\${targetAlias}" ON "\${targetAlias}"."uuid" = "\${relAlias}"."target"\`,
                    );
                } else {
                    // Reverse: TARGET (Me) <- SOURCE (Value)
                    // JoinTable: rel_Other_Me
                    joinTableName = \`rel_\${otherShort}_\${thisShort}\`;
                    selectStmt = \`SELECT \${castValueSelect}, "uuid", '\${relConfig.fieldName}' FROM inserted\`;

                    // Join logic for SELECT: From i (Me) -> JoinTable.target, JoinTable.source -> Target
                    finalSelectJoins.push(
                        \`LEFT JOIN "\${joinTableName}" AS "\${relAlias}" ON "\${relAlias}"."target" = i."uuid" AND "\${relAlias}"."field" = '\${relConfig.fieldName}'\`,
                    );
                    finalSelectJoins.push(
                        \`LEFT JOIN "\${relConfig.table}" AS "\${targetAlias}" ON "\${targetAlias}"."uuid" = "\${relAlias}"."source"\`,
                    );
                }

                // Append RETURNING 1 to ensure valid CTE syntax for data-modifying statements
                joinTableInserts.push(
                    \`INSERT INTO "\${joinTableName}" ("source", "target", "field") \${selectStmt} RETURNING 1\`,
                );

                // Add target table columns to selection
                finalSelectColumns.push(\`"\${targetAlias}".*\`);
            }
        }

        const keys = Object.keys(cleanData);
        if (keys.length === 0 && joinTableInserts.length === 0) throw new Error('No data provided for create');

        const columns = keys.map(k => \`"\${k}"\`).join(', ');
        const values = keys.map(k => this.formatValue(cleanData[k as keyof typeof cleanData])).join(', ');

        // 2. Build CTE Query
        let sql = \`WITH inserted AS (INSERT INTO "\${this.tableName}" (\${columns}) VALUES (\${values}) RETURNING *)\`;

        if (joinTableInserts.length > 0) {
            const cteJoins = joinTableInserts.map((stmt, idx) => \`, join_\${idx} AS (\${stmt})\`).join('\\n');
            sql += \`\\n\${cteJoins}\`;
        }

        // 3. Final Select with Joins
        sql += \`\\nSELECT \${finalSelectColumns.join(', ')} FROM inserted i\`;
        if (finalSelectJoins.length > 0) {
            sql += \`\\n\${finalSelectJoins.join('\\n')}\`;
        }

        console.log(sql);

        return input.data as T;
    }

    async createMany(input: CreateManyInput<T>): Promise<T[]> {
        const relationConfigs = Relations[this.tableName] || {};

        // 1. Analyze all keys across all rows to determine if we need join table handling
        const allKeys = new Set<string>();
        for (const row of input.data) {
            Object.keys(row).forEach(k => allKeys.add(k));
        }

        const hasJoinTableFields = Array.from(allKeys).some(key =>
            Object.values(relationConfigs).some(c => c.fieldName === key && c.usingJoinTable),
        );

        // 2. If Join Tables are involved, we use strict row-by-row insertion wrapped in a transaction.
        // This is required because we need to link the specific generated UUID of the new row
        // to the specific array of relations (in the CTEs generated by create()).
        if (hasJoinTableFields) {
            console.log('BEGIN;');
            for (const row of input.data) {
                // Delegate to single create logic for each row
                await this.create({ data: row });
                console.log(';'); // Terminate the statement generated by create()
            }
            console.log('COMMIT;');
            return input.data as T[];
        }

        // 3. Optimized Batch Insert for standard fields (No Join Tables)
        if (!input.data || input.data.length === 0) return [];

        const keys = Array.from(allKeys);
        const columns = keys.map(k => \`"\${k}"\`).join(', ');

        const rowValues = input.data
            .map(row => {
                const values = keys.map(k => {
                    const val = row[k as keyof CreateQuery<T>];
                    // Use DEFAULT for undefined to allow DB defaults (e.g. timestamps, uuids) to apply
                    if (val === undefined) return 'DEFAULT';
                    return this.formatValue(val);
                });
                return \`(\${values.join(', ')})\`;
            })
            .join(', ');

        const sql = \`INSERT INTO "\${this.tableName}" (\${columns}) VALUES \${rowValues} RETURNING *;\`;
        console.log(sql);

        return input.data as T[];
    }

    private formatValue(value: any): string {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') return \`'\${value.replace(/'/g, "''")}'\`;
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (value instanceof Date) return \`'\${value.toISOString()}'\`;
        if (Array.isArray(value)) {
            const content = value.map(v => this.formatValue(v)).join(',');
            return \`ARRAY[\${content}]\`;
        }
        return String(value);
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

type ScalarKeys<T> = {
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

export type FindQuery<T> = {
    authorization?: {
        userId: string;
        scopes: string[];
        recursive?: boolean;
    };
    where?: Partial<{ [K in keyof T]: T[K] | { in?: T[K][]; lt?: T[K]; gt?: T[K] } }>;
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
`);

        clientFile.formatText();
        clientFile.saveSync();
    }

    private mapFieldTypeToTsType(field: AssetTypeField): string {
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
            default:
                return 'any';
        }
    }
}
