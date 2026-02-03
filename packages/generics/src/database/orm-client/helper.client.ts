import { FindQuery, GlobalRealtionMap } from './sigauth.client.js';

export const Utils = {
    simpleQs: (obj: Record<string, any>, prefix = ''): string => {
        const parts: string[] = [];
        for (const key in obj) {
            const value = obj[key];
            const param = prefix ? `${prefix}[${key}]` : key;
            if (typeof value === 'object' && value !== null) {
                parts.push(Utils.simpleQs(value, param));
            } else {
                parts.push(`${encodeURIComponent(param)}=${encodeURIComponent(String(value))}`);
            }
        }
        return parts.join('&');
    },

    toSQL: (table: string, query: FindQuery<any>, relationMap: GlobalRealtionMap) => {
        const conditions: string[] = [];
        const joins: string[] = [];
        const selections: string[] = [`"${table}".*`];

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
                    console.warn(`No relations found for table ID '${parentTableId}'.`);
                    continue;
                }

                const relationConfig = parentRelations[relationName];
                if (!relationConfig) {
                    console.warn(`Relation '${relationName}' does not exist in table '${parentTableId}'.`);
                    continue;
                }

                const { table: targetTableId, joinType = 'forward', fieldName, usingJoinTable } = relationConfig;

                const newAlias = parentAlias === table ? relationName : `${parentAlias}_${relationName}`;

                if (usingJoinTable) {
                    // Handling N:M via Join Tables (rel_SOURCE16_TARGET16)
                    const parentHex = getShortId(parentTableId);
                    const targetHex = getShortId(targetTableId);
                    const relAlias = `rel_${newAlias}`;

                    if (joinType === 'forward') {
                        // Forward with JoinTable: Parent is Source, Target is Target.
                        // Join Table Name: rel_Parent_Target
                        // Logic: Parent.uuid -> JoinTable.source AND JoinTable.target -> Target.uuid
                        const joinTableName = `rel_${parentHex}_${targetHex}`;

                        joins.push(
                            `LEFT JOIN "${joinTableName}" AS "${relAlias}" ON "${relAlias}"."source" = "${parentAlias}"."uuid" AND "${relAlias}"."field" = '${fieldName}'`,
                        );
                        joins.push(`LEFT JOIN "${targetTableId}" AS "${newAlias}" ON "${newAlias}"."uuid" = "${relAlias}"."target"`);
                    } else {
                        // Reverse with JoinTable: Parent is Target, Target (in config) is Source.
                        // Join Table Name: rel_Target_Parent (Join table is always named Source_Target)
                        // Logic: Parent.uuid -> JoinTable.target AND JoinTable.source -> Target.uuid
                        const joinTableName = `rel_${targetHex}_${parentHex}`;

                        joins.push(
                            `LEFT JOIN "${joinTableName}" AS "${relAlias}" ON "${relAlias}"."target" = "${parentAlias}"."uuid" AND "${relAlias}"."field" = '${fieldName}'`,
                        );
                        joins.push(`LEFT JOIN "${targetTableId}" AS "${newAlias}" ON "${newAlias}"."uuid" = "${relAlias}"."source"`);
                    }
                } else {
                    // Direct 1:N or 1:1 Join
                    if (joinType === 'forward') {
                        // Forward: Custom Field points to UUID (Parent.customField -> Target.uuid)
                        // This side (Parent) holds the FK.
                        joins.push(
                            `LEFT JOIN "${targetTableId}" AS "${newAlias}" ON "${newAlias}"."uuid" = "${parentAlias}"."${fieldName}"`,
                        );
                    } else {
                        // Reverse: UUID points to Custom Field (Parent.uuid -> Target.customField)
                        // The other side (Target) holds the FK.
                        joins.push(
                            `LEFT JOIN "${targetTableId}" AS "${newAlias}" ON "${newAlias}"."${fieldName}" = "${parentAlias}"."uuid"`,
                        );
                    }
                }

                selections.push(`to_jsonb("${newAlias}".*) AS "${newAlias}"`);

                if (typeof options === 'object') {
                    processIncludes(newAlias, targetTableId, options);
                }
            }
        };

        if (query.includes) {
            processIncludes(table, table, query.includes);
        }

        const selectClause = `SELECT ${selections.join(', ')} FROM "${table}"`;
        const joinClause = joins.length ? joins.join(' ') : '';
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const orderClause = query.orderBy
            ? 'ORDER BY ' +
              Object.entries(query.orderBy)
                  .map(([k, v]) => `"${table}"."${k}" ${v!.toUpperCase()}`)
                  .join(', ')
            : '';
        const limitClause = query.limit ? `LIMIT ${query.limit}` : '';

        return `${selectClause} ${joinClause} ${whereClause} ${orderClause} ${limitClause}`.replace(/\s+/g, ' ').trim();
    },

    hydrateRow: (row: any, includes: any) => {
        if (!row || !includes) return row;

        const process = (target: any, inc: any, parentAlias: string | null) => {
            for (const [relName, subInc] of Object.entries(inc)) {
                if (!subInc) continue;

                // Matches the alias logic in toSQL
                const alias = parentAlias ? `${parentAlias}_${relName}` : relName;

                // Check if the relation data exists in the root row
                if (row[alias] !== undefined) {
                    target[relName] = row[alias];

                    // Cleanup: Remove the flattened key from the root row if it's a deep relation.
                    // (Level 1 relations are both the key and the alias, so we keep them,
                    // but deep relations like 'subject_account_grants' should be moved and removed).
                    if (parentAlias) {
                        delete row[alias];
                    }

                    // Recurse
                    if (typeof subInc === 'object' && target[relName]) {
                        process(target[relName], subInc, alias);
                    }
                }
            }
        };

        process(row, includes, null);
        return row;
    },
};

