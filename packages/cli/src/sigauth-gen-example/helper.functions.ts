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

    toSQL: (table: string, query: Query<any>) => {
        const conditions: string[] = [];

        if (query.where) {
            for (const [key, value] of Object.entries(query.where)) {
                if (typeof value === 'object' && 'in' in value) {
                    conditions.push(`"${key}" IN (${value.in.map((v: any) => `'${v}'`).join(',')})`);
                } else if (typeof value === 'object' && ('lt' in value || 'gt' in value)) {
                    if ('lt' in value) conditions.push(`"${key}" < '${value.lt}'`);
                    if ('gt' in value) conditions.push(`"${key}" > '${value.gt}'`);
                } else {
                    conditions.push(`"${key}" = '${value}'`);
                }
            }
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const orderClause = query.orderBy
            ? 'ORDER BY ' +
              Object.entries(query.orderBy)
                  .map(([k, v]) => `${k} ${v!.toUpperCase()}`)
                  .join(', ')
            : '';
        const limitClause = query.limit ? `LIMIT ${query.limit}` : '';

        return `SELECT * FROM "${table}" ${whereClause} ${orderClause} ${limitClause}`.trim();
    },
};
