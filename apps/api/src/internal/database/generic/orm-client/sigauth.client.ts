import { GenericDatabaseGateway } from '@/internal/database/generic/database.gateway';
import { ORMUtils } from '@/internal/database/generic/orm-client/helper.client';
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
import { FundamentalAssetTypeMapping } from '@sigauth/sdk/protected';
import { convertTypeTableToUuid } from '@sigauth/sdk/utils';

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
    private relations?: GlobalRealtionMap;
    private models: Partial<Record<string, Model<any>>> = {};
    private mapping?: FundamentalAssetTypeMapping;
    private client?: GenericDatabaseGateway;

    async init(mapping: FundamentalAssetTypeMapping, client: GenericDatabaseGateway) {
        this.mapping = mapping; // we dont need to save this anymore
        this.client = client;

        const assetTypes = await this.client.getAssetTypes();

        // add internals
        assetTypes.push({
            uuid: INTERNAL_ASSET_TYPE_TABLE,
            name: 'AssetType',
            fields: getMappedFields(mapping, RegistryConfigs.AssetType),
        });

        assetTypes.push({
            uuid: INTERNAL_GRANT_TABLE,
            name: 'Grant',
            fields: getMappedFields(mapping, RegistryConfigs.Grant),
        });

        assetTypes.push({
            uuid: INTERNAL_APP_ACCESS_TABLE,
            name: 'AppAccess',
            fields: getMappedFields(mapping, RegistryConfigs.AppAccess),
        });

        assetTypes.push({
            uuid: INTERNAL_PERMISSION_TABLE,
            name: 'Permission',
            fields: getMappedFields(mapping, RegistryConfigs.Permission),
        });

        this.relations = buildTypeRelations(assetTypes);
    }

    private ensureInitialized() {
        if (!this.mapping || !this.client || !this.relations) {
            throw new Error('SigauthClient not initialized. Call init() first.');
        }
    }

    private getModel<T extends object>(
        key: keyof FundamentalAssetTypeMapping & string,
        Type: new (table: any, rels: GlobalRealtionMap, client: GenericDatabaseGateway) => Model<T>,
    ): Model<T> {
        this.ensureInitialized();
        if (!this.models[key]) {
            this.models[key] = new Type(this.mapping![key], this.relations!, this.client!);
        }
        return this.models[key] as Model<T>;
    }

    get Account(): Model<Account> {
        return this.getModel<Account>('Account', Model);
    }
    get Session(): Model<Session> {
        return this.getModel<Session>('Session', Model);
    }
    get App(): Model<App> {
        return this.getModel<App>('App', Model);
    }

    get AppScope(): Model<AppScope> {
        return this.getModel<AppScope>('AppScope', Model);
    }

    get AuthorizationInstance(): Model<AuthorizationInstance> {
        return this.getModel<AuthorizationInstance>('AuthorizationInstance', Model);
    }
    get AuthorizationChallenge(): Model<AuthorizationChallenge> {
        return this.getModel<AuthorizationChallenge>('AuthorizationChallenge', Model);
    }

    // Internal
    get AssetType(): Model<AssetType> {
        return this.getModel<AssetType>('AssetType', Model);
    }

    get Grant(): Model<Grant> {
        return this.getModel<Grant>('Grant', Model);
    }

    get AppAccess(): Model<AppAccess> {
        return this.getModel<AppAccess>('AppAccess', Model);
    }

    get Permission(): Model<Permission> {
        return this.getModel<Permission>('Permission', Model);
    }
}

export class Model<T extends Record<string, any>> {
    constructor(
        private tableName: string,
        private relations: GlobalRealtionMap,
        private db: GenericDatabaseGateway,
    ) {}

    async findOne<const Q extends Omit<FindQuery<T>, 'limit'>>(
        query: Q & Exact<Omit<FindQuery<T>, 'limit'>, Q>,
    ): Promise<Payload<T, Q> | null> {
        (query as any).limit = 1;
        const qsString = ORMUtils.simpleQs(query);
        const sql = ORMUtils.toSQL(this.tableName, query, this.relations);

        const result: any = await this.db.rawQuery(sql);
        if (!result[0]) return null;
        return ORMUtils.hydrateRow(result[0] as Payload<T, Q>, query.includes);
    }

    async findMany<const Q extends FindQuery<T>>(query: Q & Exact<FindQuery<T>, Q>): Promise<Payload<T, Q>[]> {
        const qsString = ORMUtils.simpleQs(query);
        const sql = ORMUtils.toSQL(this.tableName, query, this.relations);

        const result: any = await this.db.rawQuery(sql);
        return (result as Payload<T, Q>[]).map(r => ORMUtils.hydrateRow(r, query.includes));
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

type Exact<Shape, Input extends Shape> = Shape & Record<Exclude<keyof Input, keyof Shape>, never>;

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

