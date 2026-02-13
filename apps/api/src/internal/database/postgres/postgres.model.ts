import {
    CreateInput,
    CreateManyInput,
    CreateQuery,
    DeleteInput,
    Exact,
    FindQuery,
    GlobalRealtionMap,
    Model,
    Payload,
    UpdateInput,
} from '@/internal/database/generic/sigauth.client';
import { INTERNAL_ASSET_TYPE_TABLE, INTERNAL_GRANT_TABLE } from '@sigauth/sdk/architecture';
import { convertTypeTableToUuid } from '@sigauth/sdk/utils';

export class ModelPG<T extends Record<string, any>> extends Model<T> {
    async findOne<const Q extends Omit<FindQuery<T>, 'limit'>>(
        query: Q & Exact<Omit<FindQuery<T>, 'limit'>, Q>,
    ): Promise<Payload<T, Q> | null> {
        (query as any).limit = 1;

        //const qsString = this.simpleQs(query);
        const sql = this.toSQL(this.tableName, query, this.relations);

        const result: any = await this.db.rawQuery(sql);
        if (!result[0]) return null;
        return result[0] as Payload<T, Q>;
    }

    async findMany<const Q extends FindQuery<T>>(query: Q & Exact<FindQuery<T>, Q>): Promise<Payload<T, Q>[]> {
        //const qsString = this.simpleQs(query);
        const sql = this.toSQL(this.tableName, query, this.relations);

        const result: any = await this.db.rawQuery(sql);
        return result as Payload<T, Q>[];
    }

    private getShortId(fullId: string) {
        return fullId
            .replace(/^asset[-_]/, '')
            .replace(/[-_]/g, '')
            .substring(16);
    }

    async createOne(input: CreateInput<T>): Promise<T> {
        const cleanData = { ...input.data };
        const relationConfigs = this.relations[this.tableName] || {};
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
                const valueSelect = Array.isArray(value) ? `unnest(${formattedValue})` : formattedValue;

                let joinTableName: string;
                let selectStmt: string;

                // Aliases for the final select
                const relAlias = `rel_${relName}`;
                const targetAlias = relName; // e.g. owner_accounts

                // Explicitly cast the value to UUID for the join table
                const castValueSelect = `${valueSelect}::uuid`;

                if (relConfig.joinType === 'forward') {
                    // Forward: SOURCE (Me) -> TARGET (Value)
                    // JoinTable: rel_Me_Other
                    joinTableName = `rel_${thisShort}_${otherShort}`;
                    selectStmt = `SELECT "uuid", ${castValueSelect}, '${relConfig.fieldName}' FROM inserted`;

                    // Join logic for SELECT: From i (Me) -> JoinTable.source, JoinTable.target -> Target
                    finalSelectJoins.push(
                        `LEFT JOIN "${joinTableName}" AS "${relAlias}" ON "${relAlias}"."source" = i."uuid" AND "${relAlias}"."field" = '${relConfig.fieldName}'`,
                    );
                    finalSelectJoins.push(
                        `LEFT JOIN "${relConfig.table}" AS "${targetAlias}" ON "${targetAlias}"."uuid" = "${relAlias}"."target"`,
                    );
                } else {
                    // Reverse: TARGET (Me) <- SOURCE (Value)
                    // JoinTable: rel_Other_Me
                    joinTableName = `rel_${otherShort}_${thisShort}`;
                    selectStmt = `SELECT ${castValueSelect}, "uuid", '${relConfig.fieldName}' FROM inserted`;

                    // Join logic for SELECT: From i (Me) -> JoinTable.target, JoinTable.source -> Target
                    finalSelectJoins.push(
                        `LEFT JOIN "${joinTableName}" AS "${relAlias}" ON "${relAlias}"."target" = i."uuid" AND "${relAlias}"."field" = '${relConfig.fieldName}'`,
                    );
                    finalSelectJoins.push(
                        `LEFT JOIN "${relConfig.table}" AS "${targetAlias}" ON "${targetAlias}"."uuid" = "${relAlias}"."source"`,
                    );
                }

                // Append RETURNING 1 to ensure valid CTE syntax for data-modifying statements
                joinTableInserts.push(`INSERT INTO "${joinTableName}" ("source", "target", "field") ${selectStmt} RETURNING 1`);

                // Add target table columns to selection
                finalSelectColumns.push(`"${targetAlias}".*`);
            }
        }

        const keys = Object.keys(cleanData);
        if (keys.length === 0 && joinTableInserts.length === 0) throw new Error('No data provided for create');

        const columns = keys.map(k => `"${k}"`).join(', ');
        const values = keys.map(k => this.formatValue(cleanData[k as keyof typeof cleanData])).join(', ');

        // 2. Build CTE Query
        let sql = `WITH inserted AS (INSERT INTO "${this.tableName}" (${columns}) VALUES (${values}) RETURNING *)`;

        if (joinTableInserts.length > 0) {
            const cteJoins = joinTableInserts.map((stmt, idx) => `, join_${idx} AS (${stmt})`).join('\n');
            sql += `\n${cteJoins}`;
        }

        // 3. Final Select with Joins
        sql += `\nSELECT ${finalSelectColumns.join(', ')} FROM inserted i`;
        if (finalSelectJoins.length > 0) {
            sql += `\n${finalSelectJoins.join('\n')}`;
        }

        const result: any = await this.db.rawQuery(sql);
        return result[0] as T;
    }

    async createMany(input: CreateManyInput<T>): Promise<T[]> {
        const relationConfigs = this.relations[this.tableName] || {};

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
            await this.db.rawQuery('BEGIN');
            const results: T[] = [];
            try {
                for (const row of input.data) {
                    // Delegate to single create logic for each row
                    const res = await this.createOne({ data: row });
                    results.push(res);
                }
                await this.db.rawQuery('COMMIT');
                return results;
            } catch (e) {
                await this.db.rawQuery('ROLLBACK');
                throw e;
            }
        }

        // 3. Optimized Batch Insert for standard fields (No Join Tables)
        if (!input.data || input.data.length === 0) return [];

        const keys = Array.from(allKeys);
        const columns = keys.map(k => `"${k}"`).join(', ');

        const rowValues = input.data
            .map(row => {
                const values = keys.map(k => {
                    const val = row[k as keyof CreateQuery<T>];
                    // Use DEFAULT for undefined to allow DB defaults (e.g. timestamps, uuids) to apply
                    if (val === undefined) return 'DEFAULT';
                    return this.formatValue(val);
                });
                return `(${values.join(', ')})`;
            })
            .join(', ');

        const sql = `INSERT INTO "${this.tableName}" (${columns}) VALUES ${rowValues} RETURNING *;`;

        const result: any = await this.db.rawQuery(sql);
        return result as T[];
    }

    async updateOne(input: UpdateInput<T>): Promise<T> {
        return this.executeUpdate(input.where, input.data, true);
    }

    async updateMany(input: UpdateInput<T>): Promise<T[]> {
        const result = await this.executeUpdate(input.where, input.data, false);
        return Array.isArray(result) ? result : [result];
    }

    async deleteOne(input: DeleteInput<T>): Promise<T> {
        return this.executeDelete(input.where, true);
    }

    async deleteMany(input: DeleteInput<T>): Promise<T[]> {
        const result = await this.executeDelete(input.where, false);
        return Array.isArray(result) ? result : [result];
    }

    // async updateAuthorization(input: {
    //     where: FindWhere<T>;
    //     authorization: {
    //         userUuid: string;
    //         appUuid: string;
    //         scopes: string[];
    //     };
    // }): Promise<void> {
    //     const whereClause = this.buildWhereClause(input.where);
    //     const { userUuid, appUuid, scopes } = input.authorization;

    //     if (!scopes || scopes.length === 0) return;

    //     const scopesSql = this.formatValue(scopes); // returns formatted array string e.g. ARRAY['a','b']

    //     const sql = `
    //         INSERT INTO "permission_instances" ("account", "app", "asset", "scope")
    //         SELECT ${this.formatValue(userUuid)}, ${this.formatValue(appUuid)}, "uuid", unnest(${scopesSql})
    //         FROM "${this.tableName}"
    //         ${whereClause}
    //         ON CONFLICT DO NOTHING
    //     `;

    //     await this.db.rawQuery(sql);
    // }

    private async executeDelete(where: any, single: boolean): Promise<any> {
        if (this.tableName.startsWith('_internal')) {
            // Special handling for internal types to also clean up grants and relations
            const whereClause = this.buildWhereClause(where);
            const sql = `DELETE FROM "${this.tableName}" ${whereClause} RETURNING *`;
            const result: any[] = await this.db.rawQuery(sql);
            if (single) {
                if (result.length === 0) throw new Error('Record to delete does not exist.');
                return result[0];
            }
            return result;
        }

        const whereClause = this.buildWhereClause(where);
        const thisShort = this.getShortId(this.tableName);

        // Pre-calculation of relations to check
        const relationChecks: string[] = [];
        const relationDeletes: string[] = [];

        const relationConfigs = this.relations[this.tableName] || {};
        const assetTypeUuid = convertTypeTableToUuid(this.tableName);

        let relIndex = 0;
        for (const [key, config] of Object.entries(relationConfigs)) {
            if (config.usingJoinTable) {
                const otherShort = this.getShortId(config.table);
                const fieldName = config.fieldName;

                let joinTableName: string, sourceCol: string, targetCol: string;

                if (config.joinType === 'forward') {
                    joinTableName = `rel_${thisShort}_${otherShort}`;
                    sourceCol = 'source';
                    targetCol = 'target';
                } else {
                    // reverse
                    joinTableName = `rel_${otherShort}_${thisShort}`;
                    sourceCol = 'target';
                    targetCol = 'source';
                }

                // CTE to identify candidate records on the other side of the relation BEFORE they are unlinked
                relationChecks.push(`
                    candidates_${relIndex} AS (
                        SELECT DISTINCT "${targetCol}" as "candidateUuid" 
                        FROM "${joinTableName}" 
                        WHERE "${sourceCol}" IN (SELECT "uuid" FROM targets)
                        AND "field" = '${fieldName}'
                    )
                 `);

                // Extract strategy from externalJoinKeys array (format: keys are "field#target#req#strategy")
                const stratCheck = `(
                    SELECT split_part(k, '#', 4)
                    FROM (
                        SELECT unnest("externalJoinKeys") as k 
                        FROM ${INTERNAL_ASSET_TYPE_TABLE} 
                        WHERE "uuid" = '${config.joinType == 'forward' ? assetTypeUuid : convertTypeTableToUuid(config.table)}'
                    ) as sub
                    WHERE k LIKE '${fieldName}#%'
                    LIMIT 1
                )`;

                // CTE to delete orphans if the strategy is 'cascade' and no other links exist
                relationDeletes.push(`cleanup_${relIndex} AS (
                    DELETE FROM "${config.table}"
                    WHERE "uuid" IN (
                        SELECT "candidateUuid" FROM candidates_${relIndex} c
                        WHERE NOT EXISTS (
                            SELECT 1 FROM "${joinTableName}" jt
                            WHERE jt."target" = c."candidateUuid" 
                            AND jt."field" = '${fieldName}'
                            AND jt."source" NOT IN (SELECT "uuid" FROM targets)
                        )
                    )
                    AND ${stratCheck} = 'CASCADE'
                )`);

                relIndex++;
            }
        }

        let sql = `WITH targets AS (SELECT "uuid" FROM "${this.tableName}" ${whereClause})`;

        if (relationChecks.length > 0) {
            sql += `,\n${relationChecks.join(',\n')}`;
        }

        sql += `,\ndeleted AS (DELETE FROM "${this.tableName}" WHERE "uuid" IN (SELECT "uuid" FROM targets) RETURNING *)`;
        sql += `,\nperm_del AS (DELETE FROM ${INTERNAL_GRANT_TABLE} WHERE "assetUuid" IN (SELECT "uuid" FROM deleted))`;

        if (relationDeletes.length > 0) {
            sql += `,\n${relationDeletes.join(',\n')}`;
        }

        sql += `\nSELECT * FROM deleted`;

        const result: any = await this.db.rawQuery(sql);

        if (single) {
            if (result.length !== 1) {
                if (result.length === 0) {
                    throw new Error(`Record to delete does not exist.`);
                } else {
                    throw new Error(`Delete operation failed. Expected 1 record to be deleted, but ${result.length} were found.`);
                }
            }
            return result[0] as T;
        }

        return result as T[];
    }

    private async executeUpdate(where: any, data: Partial<CreateQuery<T>>, single: boolean): Promise<any> {
        const cleanData = { ...data };
        const relationConfigs = this.relations[this.tableName] || {};

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
                const valueSelect = Array.isArray(value) ? `unnest(${formattedValue})` : formattedValue;
                const castValueSelect = `${valueSelect}::uuid`;

                let joinTableName: string;
                let deleteCondition: string;
                let insertSelect: string;

                if (relConfig.joinType === 'forward') {
                    // Forward: Me -> Other. Join Table: rel_Me_Other
                    joinTableName = `rel_${thisShort}_${otherShort}`;
                    // Delete where source is ME (from updated rows) and field matches
                    deleteCondition = `"source" IN (SELECT "uuid" FROM updated) AND "field" = '${relConfig.fieldName}'`;
                    insertSelect = `SELECT "uuid", ${castValueSelect}, '${relConfig.fieldName}' FROM updated`;
                } else {
                    // Reverse: Other -> Me. Join Table: rel_Other_Me
                    joinTableName = `rel_${otherShort}_${thisShort}`;
                    // Delete where target is ME
                    deleteCondition = `"target" IN (SELECT "uuid" FROM updated) AND "field" = '${relConfig.fieldName}'`;
                    insertSelect = `SELECT ${castValueSelect}, "uuid", '${relConfig.fieldName}' FROM updated`;
                }

                // CTE for DELETE (Remove old relations)
                joinTableOps.push(`del_${opIndex} AS (DELETE FROM "${joinTableName}" WHERE ${deleteCondition} RETURNING 1)`);
                // CTE for INSERT (Add new relations)
                joinTableOps.push(
                    `ins_${opIndex} AS (INSERT INTO "${joinTableName}" ("source", "target", "field") ${insertSelect} ON CONFLICT ON CONSTRAINT "${joinTableName}_pkey" DO NOTHING RETURNING 1)`,
                );
                opIndex++;

                // Prepare SELECT to return the updated structure
                const relAlias = `rel_${relName}`;
                const targetAlias = relName;

                if (relConfig.joinType === 'forward') {
                    finalSelectJoins.push(
                        `LEFT JOIN "${joinTableName}" AS "${relAlias}" ON "${relAlias}"."source" = u."uuid" AND "${relAlias}"."field" = '${relConfig.fieldName}'`,
                    );
                    finalSelectJoins.push(
                        `LEFT JOIN "${relConfig.table}" AS "${targetAlias}" ON "${targetAlias}"."uuid" = "${relAlias}"."target"`,
                    );
                } else {
                    finalSelectJoins.push(
                        `LEFT JOIN "${joinTableName}" AS "${relAlias}" ON "${relAlias}"."target" = u."uuid" AND "${relAlias}"."field" = '${relConfig.fieldName}'`,
                    );
                    finalSelectJoins.push(
                        `LEFT JOIN "${relConfig.table}" AS "${targetAlias}" ON "${targetAlias}"."uuid" = "${relAlias}"."source"`,
                    );
                }
                finalSelectColumns.push(`"${targetAlias}".*`);
            }
        }

        // 2. Build Main UPDATE
        const setClauses: string[] = [];
        for (const [k, v] of Object.entries(cleanData)) {
            setClauses.push(`"${k}" = ${this.formatValue(v)}`);
        }

        const whereClause = this.buildWhereClause(where);

        // If no scalar updates, we pseudo-update to ensure we return the target rows for relation updates
        const updateSet = setClauses.length > 0 ? setClauses.join(', ') : '"uuid" = "uuid"';

        let sql: string;
        if (single) {
            // Use CTE to restrict update to exactly one row (arbitrary if multiple match, but safe from mass-update)
            sql = `WITH target AS (SELECT "uuid" FROM "${this.tableName}" ${whereClause} LIMIT 1),
updated AS (UPDATE "${this.tableName}" SET ${updateSet} WHERE "uuid" IN (SELECT "uuid" FROM target) RETURNING *)`;
        } else {
            sql = `WITH updated AS (UPDATE "${this.tableName}" SET ${updateSet} ${whereClause} RETURNING *)`;
        }

        if (joinTableOps.length > 0) {
            sql += `,\n${joinTableOps.join(',\n')}`;
        }

        sql += `\nSELECT ${finalSelectColumns.join(', ')} FROM updated u`;
        if (finalSelectJoins.length > 0) {
            sql += `\n${finalSelectJoins.join('\n')}`;
        }

        const result: any = await this.db.rawQuery(sql);
        if (single) {
            if (result.rowCount === 0) {
                throw new Error('Record to update does not exist.');
            }
            return result[0];
        }

        return result;
    }

    private buildWhereClause(where: any): string {
        const buildConditions = (w: any): string[] => {
            const conditions: string[] = [];

            if (!w || Object.keys(w).length === 0) return [];

            for (const [key, value] of Object.entries(w as Record<string, any>)) {
                if (key === 'AND') {
                    const subClauses = (Array.isArray(value) ? value : [value])
                        .map((sub: any) => {
                            const subConds = buildConditions(sub);
                            return subConds.length > 0 ? `(${subConds.join(' AND ')})` : '';
                        })
                        .filter((s: string) => s !== '');
                    if (subClauses.length > 0) conditions.push(`(${subClauses.join(' AND ')})`);
                    continue;
                }
                if (key === 'OR') {
                    const subClauses = (Array.isArray(value) ? value : [value])
                        .map((sub: any) => {
                            const subConds = buildConditions(sub);
                            return subConds.length > 0 ? `(${subConds.join(' AND ')})` : '';
                        })
                        .filter((s: string) => s !== '');
                    if (subClauses.length > 0) conditions.push(`(${subClauses.join(' OR ')})`);
                    continue;
                }

                const col = `"${key}"`;

                // Check for complex operators (objects that are not Dates or Arrays)
                if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                    if ('in' in value) {
                        const val = value as { in: any[] };
                        const opts = val.in.map((v: any) => this.formatValue(v)).join(',');
                        conditions.push(`${col} IN (${opts})`);
                    } else {
                        const val = value as { lt?: any; gt?: any };
                        if (val.lt !== undefined) conditions.push(`${col} < ${this.formatValue(val.lt)}`);
                        if (val.gt !== undefined) conditions.push(`${col} > ${this.formatValue(val.gt)}`);
                    }
                } else {
                    if (value === null) {
                        conditions.push(`${col} IS NULL`);
                    } else {
                        conditions.push(`${col} = ${this.formatValue(value)}`);
                    }
                }
            }
            return conditions;
        };

        const conditions = buildConditions(where);
        return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    }

    private formatValue(value: any): string {
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (value instanceof Date) return `'${value.toISOString()}'`;
        if (Array.isArray(value)) {
            const content = value.map(v => this.formatValue(v)).join(',');
            return `ARRAY[${content}]`;
        }
        return String(value);
    }

    private toSQL(table: string, query: FindQuery<any>, relationMap: GlobalRealtionMap): string {
        const conditions: string[] = [];
        const selections: string[] = [`"${table}".*`];

        const getShortId = (fullId: string) =>
            fullId
                .replace(/^asset[-_]/, '')
                .replace(/[-_]/g, '')
                .substring(16);

        // Join rel tables automatically to fill base join fields (e.g. appUuids)
        if (relationMap && relationMap[table]) {
            for (const relationConfig of Object.values(relationMap[table])) {
                if (relationConfig.usingJoinTable && relationConfig.joinType === 'forward') {
                    const { table: targetTableId, joinType = 'forward', fieldName } = relationConfig;
                    const parentHex = getShortId(table);
                    const targetHex = getShortId(targetTableId);

                    let joinTableName = '';
                    let whereParam = '';

                    if (joinType === 'forward') {
                        joinTableName = `rel_${parentHex}_${targetHex}`;
                        whereParam = `"source" = "${table}"."uuid" AND "field" = '${fieldName}'`;
                        selections.push(
                            `COALESCE((SELECT jsonb_agg("target") FROM "${joinTableName}" WHERE ${whereParam}), '[]'::jsonb) AS "${fieldName}"`,
                        );
                    } else {
                        joinTableName = `rel_${targetHex}_${parentHex}`;
                        whereParam = `"target" = "${table}"."uuid" AND "field" = '${fieldName}'`;
                        selections.push(
                            `COALESCE((SELECT jsonb_agg("source") FROM "${joinTableName}" WHERE ${whereParam}), '[]'::jsonb) AS "${fieldName}"`,
                        );
                    }
                }
            }
        }

        if (query.where) {
            const parseWhere = (where: any): string[] => {
                const parts: string[] = [];
                for (const [key, value] of Object.entries(where)) {
                    if (value === undefined) continue;

                    if (key === 'OR' || key === 'AND') {
                        if (Array.isArray(value)) {
                            const subs = value
                                .map((w: any) => {
                                    const p = parseWhere(w);
                                    if (p.length === 0) return null;
                                    return p.length > 1 ? `(${p.join(' AND ')})` : p[0];
                                })
                                .filter(Boolean);

                            if (subs.length > 0) {
                                parts.push(`(${subs.join(` ${key} `)})`);
                            }
                        }
                        continue;
                    }

                    // Check if field is a relation mapping first
                    const relationConfig =
                        relationMap && relationMap[table] ? Object.values(relationMap[table]).find(r => r.fieldName === key) : null;

                    if (relationConfig && relationConfig.usingJoinTable) {
                        const { table: targetTableId, joinType = 'forward' } = relationConfig;
                        const parentHex = getShortId(table);
                        const targetHex = getShortId(targetTableId);

                        let joinTableName = '';
                        let parentCol = '';
                        let valCol = '';

                        if (joinType === 'forward') {
                            joinTableName = `rel_${parentHex}_${targetHex}`;
                            parentCol = 'source';
                            valCol = 'target';
                        } else {
                            joinTableName = `rel_${targetHex}_${parentHex}`;
                            parentCol = 'target';
                            valCol = 'source';
                        }

                        let valuesToCheck: any[] = [];
                        if (Array.isArray(value)) {
                            valuesToCheck = value;
                        } else if (typeof value === 'object' && value !== null && 'in' in value) {
                            valuesToCheck = (value as any).in;
                        } else if (typeof value !== 'object' && value !== null) {
                            valuesToCheck = [value];
                        }

                        if (valuesToCheck.length > 0) {
                            const valList = valuesToCheck.map(v => `'${v}'`).join(',');
                            parts.push(
                                `EXISTS (SELECT 1 FROM "${joinTableName}" WHERE "${joinTableName}"."${parentCol}" = "${table}"."uuid" AND "${joinTableName}"."field" = '${key}' AND "${joinTableName}"."${valCol}" IN (${valList}))`,
                            );
                        }
                        continue;
                    }

                    const col = `"${table}"."${key}"`;

                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        if ('in' in value) {
                            const val = value as { in: any[] };
                            parts.push(`${col} IN (${val.in.map((v: any) => `'${v}'`).join(',')})`);
                        } else if ('lt' in value || 'gt' in value) {
                            const val = value as { lt?: any; gt?: any };
                            if (val.lt !== undefined) parts.push(`${col} < '${val.lt}'`);
                            if (val.gt !== undefined) parts.push(`${col} > '${val.gt}'`);
                        } else {
                            parts.push(`${col} = '${value}'`);
                        }
                    } else {
                        if (value === null) {
                            parts.push(`${col} IS NULL`);
                        } else {
                            parts.push(`${col} = '${value}'`);
                        }
                    }
                }
                return parts;
            };

            conditions.push(...parseWhere(query.where));
        }

        // Helper to generate subquery logic for relations
        const processIncludes = (parentAlias: string, parentTableId: string, includes: any, isRoot = false): string[] => {
            const subQueryParts: string[] = [];

            for (const [relationName, options] of Object.entries(includes)) {
                if (!options) continue;

                const parentRelations = relationMap[parentTableId];
                if (!parentRelations) {
                    console.warn(`No relations found for table ID '${parentTableId}'.`);
                    continue;
                }

                const relationConfig = parentRelations[relationName];
                if (!relationConfig) {
                    console.warn(`Relation '${relationName}' does not exist in table '${parentTableId}'.`);
                    continue;
                }

                const { table: targetTableId, joinType = 'forward', fieldName, usingJoinTable } = relationConfig;
                const newAlias = `${parentAlias}_${relationName}`;

                // 1. Recursive JSON building for nested includes
                let itemSelect = `to_jsonb("${newAlias}".*)`;
                if (typeof options === 'object') {
                    const nested = processIncludes(newAlias, targetTableId, options);
                    if (nested.length > 0) {
                        // Merge current object with nested properties: json || jsonb_build_object('key', val)
                        itemSelect = `(to_jsonb("${newAlias}".*) || jsonb_build_object(${nested.join(', ')}))`;
                    }
                }

                // 2. Build Join/Where clauses for the subquery
                let fromClause = `FROM "${targetTableId}" AS "${newAlias}"`;
                let whereClause = '';

                if (usingJoinTable) {
                    const parentHex = getShortId(parentTableId);
                    const targetHex = getShortId(targetTableId);
                    const relAlias = `rel_${newAlias}`;

                    if (joinType === 'forward') {
                        const joinTableName = `rel_${parentHex}_${targetHex}`;
                        fromClause += ` JOIN "${joinTableName}" AS "${relAlias}" ON "${newAlias}"."uuid" = "${relAlias}"."target"`;
                        whereClause = `"${relAlias}"."source" = "${parentAlias}"."uuid" AND "${relAlias}"."field" = '${fieldName}'`;
                    } else {
                        const joinTableName = `rel_${targetHex}_${parentHex}`;
                        fromClause += ` JOIN "${joinTableName}" AS "${relAlias}" ON "${newAlias}"."uuid" = "${relAlias}"."source"`;
                        whereClause = `"${relAlias}"."target" = "${parentAlias}"."uuid" AND "${relAlias}"."field" = '${fieldName}'`;
                    }
                } else {
                    if (joinType === 'forward') {
                        // Parent (N) -> Child (1)
                        whereClause = `"${newAlias}"."uuid" = "${parentAlias}"."${fieldName}"`;
                    } else {
                        // Parent (1) -> Child (N)
                        whereClause = `"${newAlias}"."${fieldName}" = "${parentAlias}"."uuid"`;
                    }
                }

                // 3. Determine singular (Object) vs plural (Array) result
                // 'forward' without join table implies N:1 (Object)
                // Everything else (reverse, join table) implies 1:N or N:M (Array)
                const isArray = usingJoinTable || joinType === 'reverse';

                let selectionRef;
                if (isArray) {
                    // Return empty array instead of null if no matches
                    selectionRef = `COALESCE((SELECT jsonb_agg(${itemSelect}) ${fromClause} WHERE ${whereClause}), '[]'::jsonb)`;
                } else {
                    selectionRef = `(SELECT ${itemSelect} ${fromClause} WHERE ${whereClause})`;
                }

                if (isRoot) {
                    selections.push(`${selectionRef} AS "${relationName}"`);
                } else {
                    // For nested builds, we return key-value pairs for jsonb_build_object
                    subQueryParts.push(`'${relationName}', ${selectionRef}`);
                }
            }
            return subQueryParts;
        };

        if (query.includes) {
            processIncludes(table, table, query.includes, true);
        }

        const selectClause = `SELECT ${selections.join(', ')} FROM "${table}"`;
        // No top-level JOINs anymore, everything is sub-selected
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const orderClause = query.orderBy
            ? 'ORDER BY ' +
              Object.entries(query.orderBy)
                  .map(([k, v]) => `"${table}"."${k}" ${v!.toUpperCase()}`)
                  .join(', ')
            : '';
        const limitClause = query.limit ? `LIMIT ${query.limit}` : '';

        return `${selectClause} ${whereClause} ${orderClause} ${limitClause}`.replace(/\s+/g, ' ').trim();
    }
}
