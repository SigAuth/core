import { AssetFieldType, AssetType, AssetTypeField, AssetTypeRelationField } from '@sigauth/generics/asset';
import knex, { Knex } from 'knex';
import { DatabaseGateway } from './databse.gateway.js';

export class PostgresDriver extends DatabaseGateway {
    private db: Knex | null = null;

    async connect(connectionString: string): Promise<boolean> {
        this.db = knex({
            client: 'pg',
            connection: connectionString,
        });

        await this.db.raw('select 1');
        return true;
    }

    async disconnect(): Promise<boolean> {
        if (this.db) {
            await this.db.destroy();
            this.db = null;
        }
        return true;
    }

    async getAssetTypes(): Promise<AssetType[]> {
        if (!this.db) throw new Error('Database not connected');

        const types: AssetType[] = [];
        const typeRows = await this.db.select('*').from('asset_types');
        for (const row of typeRows) {
            // fetch table signature and fields
            const tableName = `asset_${row.uuid.replace(/-/g, '_')}`;
            const genericKeys = await this.db
                .select('column_name', 'data_type', 'is_nullable', 'udt_name')
                .from('information_schema.columns')
                .where('table_name', tableName);

            const foreignKeys = await this.db
                .select('kcu.column_name', 'ccu.table_name as foreign_table_name', 'rc.delete_rule as on_delete')
                .from('information_schema.key_column_usage as kcu')
                .join('information_schema.referential_constraints as rc', 'kcu.constraint_name', 'rc.constraint_name')
                .join('information_schema.constraint_column_usage as ccu', 'rc.unique_constraint_name', 'ccu.constraint_name')
                .where('kcu.table_name', tableName);

            const fields: AssetTypeField[] = [];

            for (const key of genericKeys) {
                const foreignKey = foreignKeys.find(fk => fk.column_name === key.column_name);

                const field: AssetTypeField = {
                    name: key.column_name,
                    type: foreignKey ? AssetFieldType.RELATION : this.mapPostgresTypeToAssetFieldType(key.udt_name),
                    required: key.is_nullable === 'NO',
                    allowMultiple: key.data_type.startsWith('ARRAY'),
                };

                if (foreignKey) {
                    (field as AssetTypeRelationField).referentialIntegrityStrategy = foreignKey.on_delete;
                    (field as AssetTypeRelationField).targetAssetType = foreignKey.foreign_table_name
                        .replace('asset_', '')
                        .replace(/_/g, '-');
                }
                fields.push(field);
            }

            // check for join tables
            for (const externalJoinKey of row.externalJoinKeys) {
                const [fieldName, targetAssetType, required, referentialIntegrityStrategy] = externalJoinKey.split('#');
                fields.push({
                    name: fieldName,
                    type: AssetFieldType.RELATION,
                    required: required == '1',
                    allowMultiple: true,
                    targetAssetType,
                    referentialIntegrityStrategy: referentialIntegrityStrategy,
                } as AssetTypeRelationField);
            }
            // TODO add processing of join tables

            types.push({
                uuid: row.uuid,
                name: row.name,
                fields,
            });
        }

        return types;
    }

    private async getJoinTables(uuid: string) {
        if (!this.db) throw new Error('Database not connected');

        // Pattern erstellen.
        // Falls deine Tabellenstruktur wie bei assets ist (Unterstriche statt Bindestriche):
        const formattedUuid = uuid.replace(/-/g, '').substring(0, 16);
        const searchPattern = `rel_${formattedUuid}%`;

        // Abfrage mit Knex Query Builder
        const tables = await this.db
            .select('table_name')
            .from('information_schema.tables')
            .where('table_schema', 'public')
            .andWhere('table_name', 'like', searchPattern);

        return tables;
    }

    private mapPostgresTypeToAssetFieldType(pgType: string): AssetFieldType {
        if (pgType.includes('varchar') || pgType.includes('uuid')) {
            return AssetFieldType.VARCHAR;
        } else if (pgType.includes('int4') || pgType.includes('int8')) {
            return AssetFieldType.INTEGER;
        } else if (pgType.includes('text')) {
            return AssetFieldType.TEXT;
        } else if (pgType.includes('float8') || pgType.includes('numeric')) {
            return AssetFieldType.FLOAT8;
        } else if (pgType.startsWith('timestamp')) {
            return AssetFieldType.DATE;
        } else if (pgType.includes('bool')) {
            return AssetFieldType.BOOLEAN;
        }
        throw new Error(`Unsupported Postgres type: ${pgType}`);
    }
}
