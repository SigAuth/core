import { AssetFieldType, AssetType, AssetTypeRelationField } from '@sigauth/generics/asset';
import { Project, VariableDeclarationKind } from 'ts-morph';

export class ClientGenerator {
    constructor(
        private readonly project: Project,
        private readonly assetTypes: AssetType[],
        private readonly outPath: string,
    ) {}

    generate() {
        const clientFile = this.project.createSourceFile(`${this.outPath}/sigauth.client.ts`, '', { overwrite: true });

        // 1. Imports
        clientFile.addStatements(`import { Client } from 'pg';`);
        clientFile.addStatements(`import { configDotenv } from 'dotenv';`);
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
        const properties = this.assetTypes.map(t => {
            const propName = t.name.charAt(0).toLowerCase() + t.name.slice(1);
            return `    public ${propName}: Model<${t.name}>;`;
        });

        const initializers = this.assetTypes.map(t => {
            const propName = t.name.charAt(0).toLowerCase() + t.name.slice(1);
            return `        this.${propName} = new Model<${t.name}>(TableIds.${t.name}, this.client);`;
        });

        clientFile.addStatements(`
export class SigauthClient {
    private client: Client;

${properties.join('\n')}

    constructor() {
        configDotenv();
        this.client = new Client({
            connectionString: process.env.DATABASE_URL,
        });
        this.client.connect();

${initializers.join('\n')}
    }
}
`);

        // 6. Static Boilerplate (Model, Types)
        clientFile.addStatements(`
export class Model<T extends Record<string, any>> {
    constructor(
        private tableName: string,
        private client: Client,
    ) {}

    async findOne<Q extends Omit<FindQuery<T>, 'limit'>>(query: Q): Promise<Payload<T, Q> | null> {
        (query as any).limit = 1;
        const qsString = Utils.simpleQs(query);
        const sql = Utils.toSQL(this.tableName, query, Relations);

        const result = await this.client.query(sql);
        return (result.rows[0] as Payload<T, Q>) || null;
    }

    async findMany<Q extends FindQuery<T>>(query: Q): Promise<Payload<T, Q>[]> {
        const qsString = Utils.simpleQs(query);
        const sql = Utils.toSQL(this.tableName, query, Relations);

        const result = await this.client.query(sql);
        return result.rows as Payload<T, Q>[];
    }

    private getShortId(fullId: string) {
        return fullId
            .replace(/^asset[-_]/, '')
            .replace(/[-_]/g, '')
            .substring(0, 16);
    }

    async createOne(input: CreateInput<T>): Promise<T> {
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

        const result = await this.client.query(sql);

        return result.rows[0] as T;
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
        // to the specific array of relations (in the CTEs generated by createOne()).
        if (hasJoinTableFields) {
            await this.client.query('BEGIN');
            const results: T[] = [];
            try {
                for (const row of input.data) {
                    // Delegate to single create logic for each row
                    const res = await this.createOne({ data: row });
                    results.push(res);
                }
                await this.client.query('COMMIT');
                return results;
            } catch (e) {
                await this.client.query('ROLLBACK');
                throw e;
            }
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
        
        const result = await this.client.query(sql);

        return result.rows as T[];
    }

    async updateOne(input: UpdateInput<T>): Promise<T> {
        return this.executeUpdate(input.where, input.data, true);
    }

    async updateMany(input: UpdateManyInput<T>): Promise<T[]> {
        const result = await this.executeUpdate(input.where, input.data, false);
        return Array.isArray(result) ? result : [result];
    }

    async deleteOne(input: DeleteInput<T>): Promise<T> {
        return this.executeDelete(input.where, true);
    }

    async deleteMany(input: DeleteManyInput<T>): Promise<T[]> {
        const result = await this.executeDelete(input.where, false);
        return Array.isArray(result) ? result : [result];
    }

    private async executeDelete(where: any, single: boolean): Promise<any> {
        const whereClause = this.buildWhereClause(where);
        const sql = \`DELETE FROM "\${this.tableName}" \${whereClause} RETURNING *\`;

        const result = await this.client.query(sql);

        if (single) {
            if (result.rowCount !== 1) {
                if (result.rowCount === 0) {
                    throw new Error(\`Record to delete does not exist.\`);
                } else {
                    throw new Error(\`Delete operation failed. Expected 1 record to be deleted, but \${result.rowCount} were found.\`);
                }
            }
            return result.rows[0] as T;
        }

        return result.rows as T[];
    }

    private async executeUpdate(where: any, data: Partial<CreateQuery<T>>, single: boolean): Promise<any> {
        const cleanData = { ...data };
        const relationConfigs = Relations[this.tableName] || {};

        const joinTableOps: string[] = [];
        const finalSelectJoins: string[] = [];
        const finalSelectColumns: string[] = ['u.*'];

        // 1. Handle Join Tables (Relation Fields)
        let opIndex = 0;
        for (const key of Object.keys(data)) {
            const entry = Object.entries(relationConfigs).find(([, c]) => c.fieldName === key && c.usingJoinTable);

            if (entry) {
                const [relName, relConfig] = entry;

                // Remove from scalar update payload
                delete cleanData[key as keyof typeof cleanData];

                const thisShort = this.getShortId(this.tableName);
                const otherShort = this.getShortId(relConfig.table);
                const value = data[key as keyof CreateQuery<T>];

                // Format value (handles arrays -> ARRAY['a','b'] or scalars)
                const formattedValue = this.formatValue(value);
                const valueSelect = Array.isArray(value) ? \`unnest(\${formattedValue})\` : formattedValue;
                const castValueSelect = \`\${valueSelect}::uuid\`;

                let joinTableName: string;
                let deleteCondition: string;
                let insertSelect: string;

                if (relConfig.joinType === 'forward') {
                    // Forward: Me -> Other. Join Table: rel_Me_Other
                    joinTableName = \`rel_\${thisShort}_\${otherShort}\`;
                    // Delete where source is ME (from updated rows) and field matches
                    deleteCondition = \`"source" IN (SELECT "uuid" FROM updated) AND "field" = '\${relConfig.fieldName}'\`;
                    insertSelect = \`SELECT "uuid", \${castValueSelect}, '\${relConfig.fieldName}' FROM updated\`;
                } else {
                    // Reverse: Other -> Me. Join Table: rel_Other_Me
                    joinTableName = \`rel_\${otherShort}_\${thisShort}\`;
                    // Delete where target is ME
                    deleteCondition = \`"target" IN (SELECT "uuid" FROM updated) AND "field" = '\${relConfig.fieldName}'\`;
                    insertSelect = \`SELECT \${castValueSelect}, "uuid", '\${relConfig.fieldName}' FROM updated\`;
                }

                // CTE for DELETE (Remove old relations)
                joinTableOps.push(\`del_\${opIndex} AS (DELETE FROM "\${joinTableName}" WHERE \${deleteCondition} RETURNING 1)\`);
                // CTE for INSERT (Add new relations)
                joinTableOps.push(
                    \`ins_\${opIndex} AS (INSERT INTO "\${joinTableName}" ("source", "target", "field") \${insertSelect} RETURNING 1)\`,
                );
                opIndex++;

                // Prepare SELECT to return the updated structure
                const relAlias = \`rel_\${relName}\`;
                const targetAlias = relName;

                if (relConfig.joinType === 'forward') {
                    finalSelectJoins.push(
                        \`LEFT JOIN "\${joinTableName}" AS "\${relAlias}" ON "\${relAlias}"."source" = u."uuid" AND "\${relAlias}"."field" = '\${relConfig.fieldName}'\`,
                    );
                    finalSelectJoins.push(
                        \`LEFT JOIN "\${relConfig.table}" AS "\${targetAlias}" ON "\${targetAlias}"."uuid" = "\${relAlias}"."target"\`,
                    );
                } else {
                    finalSelectJoins.push(
                        \`LEFT JOIN "\${joinTableName}" AS "\${relAlias}" ON "\${relAlias}"."target" = u."uuid" AND "\${relAlias}"."field" = '\${relConfig.fieldName}'\`,
                    );
                    finalSelectJoins.push(
                        \`LEFT JOIN "\${relConfig.table}" AS "\${targetAlias}" ON "\${targetAlias}"."uuid" = "\${relAlias}"."source"\`,
                    );
                }
                finalSelectColumns.push(\`"\${targetAlias}".*\`);
            }
        }

        // 2. Build Main UPDATE
        const setClauses: string[] = [];
        for (const [k, v] of Object.entries(cleanData)) {
            setClauses.push(\`"\${k}" = \${this.formatValue(v)}\`);
        }

        const whereClause = this.buildWhereClause(where);

        // If no scalar updates, we pseudo-update to ensure we return the target rows for relation updates
        const updateSet = setClauses.length > 0 ? setClauses.join(', ') : '"uuid" = "uuid"';
        
        let sql: string;
        if (single) {
            // Use CTE to restrict update to exactly one row (arbitrary if multiple match, but safe from mass-update)
            sql = \`WITH target AS (SELECT "uuid" FROM "\${this.tableName}" \${whereClause} LIMIT 1),
updated AS (UPDATE "\${this.tableName}" SET \${updateSet} WHERE "uuid" IN (SELECT "uuid" FROM target) RETURNING *)\`;
        } else {
            sql = \`WITH updated AS (UPDATE "\${this.tableName}" SET \${updateSet} \${whereClause} RETURNING *)\`;
        }

        if (joinTableOps.length > 0) {
            sql += \`,\\n\${joinTableOps.join(',\\n')}\`;
        }

        sql += \`\\nSELECT \${finalSelectColumns.join(', ')} FROM updated u\`;
        if (finalSelectJoins.length > 0) {
            sql += \`\\n\${finalSelectJoins.join('\\n')}\`;
        }

        const result = await this.client.query(sql);

        if (single) {
            if (result.rowCount === 0) {
                throw new Error('Record to update does not exist.');
            }
            return result.rows[0];
        }

        return result.rows;
    }

    private buildWhereClause(where: any): string {
        const buildConditions = (w: any): string[] => {
            const conditions: string[] = [];

            if (!w || Object.keys(w).length === 0) return [];

            for (const [key, value] of Object.entries(w as Record<string, any>)) {
                if (key === 'AND') {
                    const subClauses = (Array.isArray(value) ? value : [value]).map((sub: any) => {
                        const subConds = buildConditions(sub);
                        return subConds.length > 0 ? \`(\${subConds.join(' AND ')})\` : '';
                    }).filter((s: string) => s !== '');
                    if (subClauses.length > 0) conditions.push(\`(\${subClauses.join(' AND ')})\`);
                    continue;
                }
                if (key === 'OR') {
                    const subClauses = (Array.isArray(value) ? value : [value]).map((sub: any) => {
                        const subConds = buildConditions(sub);
                        return subConds.length > 0 ? \`(\${subConds.join(' AND ')})\` : '';
                    }).filter((s: string) => s !== '');
                    if (subClauses.length > 0) conditions.push(\`(\${subClauses.join(' OR ')})\`);
                    continue;
                }

                const col = \`"\${key}"\`;

                // Check for complex operators (objects that are not Dates or Arrays)
                if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                    if ('in' in value) {
                        const val = value as { in: any[] };
                        const opts = val.in.map((v: any) => this.formatValue(v)).join(',');
                        conditions.push(\`\${col} IN (\${opts})\`);
                    } else {
                        const val = value as { lt?: any; gt?: any };
                        if (val.lt !== undefined) conditions.push(\`\${col} < \${this.formatValue(val.lt)}\`);
                        if (val.gt !== undefined) conditions.push(\`\${col} > \${this.formatValue(val.gt)}\`);
                    }
                } else {
                    conditions.push(\`\${col} = \${this.formatValue(value)}\`);
                }
            }
            return conditions;
        };

        const conditions = buildConditions(where);
        return conditions.length > 0 ? \`WHERE \${conditions.join(' AND ')}\` : '';
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

export type FindWhere<T> = Partial<{ [K in keyof T]: T[K] | { in?: T[K][]; lt?: T[K]; gt?: T[K] } }> & {
    AND?: FindWhere<T> | FindWhere<T>[];
    OR?: FindWhere<T> | FindWhere<T>[];
};

export type FindQuery<T> = {
    authorization?: {
        userId: string;
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

export type UpdateManyInput<T> = {
    where: FindWhere<T>;
    data: Partial<CreateQuery<T>>;
};

export type DeleteInput<T> = {
    where: FindWhere<T>;
};

export type DeleteManyInput<T> = {
    where: FindWhere<T>;
};
`);

        clientFile.formatText();
        clientFile.saveSync();
    }
}
