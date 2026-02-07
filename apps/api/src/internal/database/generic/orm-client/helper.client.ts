import { FindQuery, GlobalRealtionMap } from './sigauth.client.js';

export const ORMUtils = {
    simpleQs: (obj: Record<string, any>, prefix = ''): string => {
        const parts: string[] = [];
        for (const key in obj) {
            const value = obj[key];
            const param = prefix ? `${prefix}[${key}]` : key;
            if (typeof value === 'object' && value !== null) {
                parts.push(ORMUtils.simpleQs(value, param));
            } else {
                parts.push(`${encodeURIComponent(param)}=${encodeURIComponent(String(value))}`);
            }
        }
        return parts.join('&');
    },

    toSQL: (table: string, query: FindQuery<any>, relationMap: GlobalRealtionMap) => {
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
                if (relationConfig.usingJoinTable) {
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
                        parts.push(`${col} = '${value}'`);
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
    },

    hydrateRow: (row: any, includes: any) => {
        return row;
    },
};

