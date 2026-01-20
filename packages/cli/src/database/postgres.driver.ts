import { AssetFieldType, AssetType, AssetTypeField, AssetTypeRelationField } from '@sigauth/generics/asset';
import { Client } from 'pg';
import { DatabaseGateway } from './database.gateway.js';

export class PostgresDriver extends DatabaseGateway {
    private client: Client | null = null;

    async connect(connectionString: string): Promise<boolean> {
        this.client = new Client({
            connectionString: connectionString,
        });
        await this.client.connect();

        await this.client.query('select 1');
        return true;
    }

    async disconnect(): Promise<boolean> {
        if (this.client) {
            await this.client.end();
            this.client = null;
        }
        return true;
    }

    async getAssetTypes(): Promise<AssetType[]> {
        if (!this.client) throw new Error('Database not connected');

        const types: AssetType[] = [];
        const typeRes = await this.client.query('SELECT * FROM asset_types');

        for (const row of typeRes.rows) {
            // fetch table signature and fields
            const tableName = `asset_${row.uuid.replace(/-/g, '_')}`;

            const genericKeysRes = await this.client.query(
                `SELECT column_name, data_type, is_nullable, udt_name 
                 FROM information_schema.columns 
                 WHERE table_name = $1`,
                [tableName],
            );
            const genericKeys = genericKeysRes.rows;

            const foreignKeysRes = await this.client.query(
                `SELECT kcu.column_name, ccu.table_name as foreign_table_name, rc.delete_rule as on_delete
                 FROM information_schema.key_column_usage as kcu
                 JOIN information_schema.referential_constraints as rc ON kcu.constraint_name = rc.constraint_name
                 JOIN information_schema.constraint_column_usage as ccu ON rc.unique_constraint_name = ccu.constraint_name
                 WHERE kcu.table_name = $1`,
                [tableName],
            );
            const foreignKeys = foreignKeysRes.rows;

            const fields: AssetTypeField[] = [];

            for (const key of genericKeys) {
                const foreignKey = foreignKeys.find((fk: any) => fk.column_name === key.column_name);

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
            if (row.externalJoinKeys) {
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
            }

            types.push({
                uuid: row.uuid,
                name: row.name,
                fields,
            });
        }

        return types;
    }

    private async getJoinTables(uuid: string) {
        if (!this.client) throw new Error('Database not connected');

        // Pattern erstellen.
        // Falls deine Tabellenstruktur wie bei assets ist (Unterstriche statt Bindestriche):
        const formattedUuid = uuid.replace(/-/g, '').substring(0, 16);
        const searchPattern = `rel_${formattedUuid}%`;

        // Abfrage mit Pg Client
        const res = await this.client.query(
            `SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name LIKE $1`,
            [searchPattern],
        );

        return res.rows;
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
