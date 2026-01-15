import { Query } from './sigauth.client.js';

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

    toSQL: (table: string, query: Query<any>, relationMap: Record<string, Record<string, string>>) => {
        const conditions: string[] = [];
        const joins: string[] = [];
        const selections: string[] = [`"${table}".*`];

        if (query.where) {
            for (const [key, value] of Object.entries(query.where)) {
                const col = `"${table}"."${key}"`;

                if (typeof value === 'object' && value !== null) {
                    if ('in' in value) {
                        const val = value as { in: any[] };
                        conditions.push(`${col} IN (${val.in.map((v: any) => `'${v}'`).join(',')})`);
                    } else if ('lt' in value || 'gt' in value) {
                        const val = value as { lt?: any; gt?: any };
                        if (val.lt !== undefined) conditions.push(`${col} < '${val.lt}'`);
                        if (val.gt !== undefined) conditions.push(`${col} > '${val.gt}'`);
                    }
                } else {
                    conditions.push(`${col} = '${value}'`);
                }
            }
        }

        const processIncludes = (parentAlias: string, parentTableId: string, includes: any) => {
            for (const [relationName, options] of Object.entries(includes)) {
                if (!options) continue;

                const parentRelations = relationMap[parentTableId];

                if (!parentRelations) {
                    console.warn(`Keine Relationen für Tabelle '${parentTableId}' definiert.`);
                    continue;
                }

                const targetTableId = parentRelations[relationName];
                if (!targetTableId) {
                    console.warn(`Relation '${relationName}' existiert nicht in Tabelle '${parentTableId}'.`);
                    continue;
                }

                const newAlias = parentAlias === table ? relationName : `${parentAlias}_${relationName}`;

                joins.push(
                    `LEFT JOIN "${targetTableId}" AS "${newAlias}" ON "${newAlias}"."${parentTableId}_uuid" = "${parentAlias}"."uuid"`,
                );
                selections.push(`"${newAlias}".*`);

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
};
