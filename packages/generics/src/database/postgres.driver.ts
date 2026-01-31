import knex, { Knex } from 'knex';
import { TableIdSignature } from 'src/database/orm-client/sigauth.client.js';
import {
    Asset,
    AssetFieldType,
    AssetType,
    AssetTypeField,
    AssetTypeRelationField,
    INTERNAL_APP_ACCESS_TABLE,
    INTERNAL_ASSET_TYPE_TABLE,
    INTERNAL_GRANT_TABLE,
    INTERNAL_PERMISSION_TABLE,
    SELF_REFERENCE_ASSET_TYPE_UUID,
} from '../asset.types.js';
import { GenericDatabaseGateway } from './database.gateway.js';

export class GenericPostgresDriver extends GenericDatabaseGateway {
    protected db?: Knex;

    async connect(connectionString: string) {
        if (!this.connect && !process.env.DATABASE_URL) throw new Error('DATABASE_URL not set in env');

        this.db = knex({
            client: 'pg',
            connection: process.env.DATABASE_URL,
        });
        this.logger.log('Connected to Postgres database!');
    }

    async initializeSchema(): Promise<TableIdSignature> {
        if (!this.db) throw new Error('Database not connected');

        // generate base table to maintain asset types
        if (!(await this.db.schema.hasTable(INTERNAL_ASSET_TYPE_TABLE))) {
            await this.db.schema.createTable(INTERNAL_ASSET_TYPE_TABLE, table => {
                table.uuid('uuid').primary().defaultTo(this.db!.raw('uuidv7()')); // Primary key
                table.string('name').notNullable().unique();
                table.specificType('externalJoinKeys', 'varchar[]');
            });

            await this.db(INTERNAL_ASSET_TYPE_TABLE).insert({
                uuid: SELF_REFERENCE_ASSET_TYPE_UUID,
                name: 'AssetType',
                externalJoinKeys: [],
            });
        }

        // create asset types for account, mirror, sessions, and auth
        const accountType = await this.createAssetType('Account', [
            { name: 'username', type: AssetFieldType.VARCHAR, required: true },
            { name: 'email', type: AssetFieldType.VARCHAR, required: true },
            { name: 'api', type: AssetFieldType.VARCHAR },
            { name: 'twoFactorCode', type: AssetFieldType.VARCHAR },
            { name: 'deactivated', type: AssetFieldType.BOOLEAN, required: true },
            { name: 'passwordHash', type: AssetFieldType.VARCHAR, required: true },
        ]);
        if (!accountType) throw new Error('Failed to create Account asset type during initialization');

        const sessionType = await this.createAssetType('Session', [
            {
                name: 'subjectUuid',
                type: AssetFieldType.RELATION,
                required: true,
                targetAssetType: accountType,
                referentialIntegrityStrategy: 'CASCADE',
            },
            { name: 'expire', type: AssetFieldType.INTEGER, required: true }, // todo is there a native way to expire rows in Postgres?
            { name: 'created', type: AssetFieldType.INTEGER, required: true },
        ]);
        if (!sessionType) throw new Error('Failed to create Session asset type during initialization');

        const appType = await this.createAssetType('App', [
            { name: 'name', type: AssetFieldType.VARCHAR, required: true },
            { name: 'url', type: AssetFieldType.VARCHAR, required: true },
            { name: 'oidcAuthCodeCb', type: AssetFieldType.VARCHAR },
            { name: 'token', type: AssetFieldType.VARCHAR },
        ]);
        if (!appType) throw new Error('Failed to create App asset type during initialization');

        const mirrorType = await this.createAssetType('Mirror', [
            { name: 'name', type: AssetFieldType.VARCHAR, required: true },
            { name: 'code', type: AssetFieldType.TEXT, required: true },
            { name: 'autoRun', type: AssetFieldType.BOOLEAN, required: true },
            { name: 'autoRunInterval', type: AssetFieldType.INTEGER },
            { name: 'lastRun', type: AssetFieldType.DATE },
            { name: 'lastResult', type: AssetFieldType.VARCHAR },
        ]);
        if (!mirrorType) throw new Error('Failed to create Mirror asset type during initialization');

        const authInstanceType = await this.createAssetType('AuthorizationInstance', [
            {
                name: 'sessionUuid',
                type: AssetFieldType.RELATION,
                required: true,
                targetAssetType: sessionType,
                referentialIntegrityStrategy: 'CASCADE',
            },
            {
                name: 'appUuid',
                type: AssetFieldType.RELATION,
                required: true,
                targetAssetType: appType,
                referentialIntegrityStrategy: 'CASCADE',
            },
            { name: 'refreshToken', type: AssetFieldType.VARCHAR, required: true },
            { name: 'accessToken', type: AssetFieldType.VARCHAR, required: true },
        ]);
        if (!authInstanceType) throw new Error('Failed to create AuthorizationInstance asset type during initialization');

        const authChallengeType = await this.createAssetType('AuthorizationChallenge', [
            {
                name: 'sessionUuid',
                type: AssetFieldType.RELATION,
                required: true,
                targetAssetType: sessionType,
                referentialIntegrityStrategy: 'CASCADE',
            },
            {
                name: 'appUuid',
                type: AssetFieldType.RELATION,
                required: true,
                targetAssetType: appType,
                referentialIntegrityStrategy: 'CASCADE',
            },
            { name: 'authCode', type: AssetFieldType.VARCHAR, required: true },
            { name: 'challenge', type: AssetFieldType.VARCHAR, required: true },
            { name: 'redirectUri', type: AssetFieldType.VARCHAR, required: true },
            { name: 'created', type: AssetFieldType.DATE, required: true },
        ]);
        if (!authChallengeType) throw new Error('Failed to create AuthorizationChallenge asset type during initialization');

        if (!(await this.db.schema.hasTable(INTERNAL_GRANT_TABLE))) {
            await this.db.schema.createTable(INTERNAL_GRANT_TABLE, table => {
                table
                    .uuid('accountUuid')
                    .notNullable()
                    .references('uuid')
                    .inTable(`asset_${accountType.replace(/-/g, '_')}`)
                    .onDelete('CASCADE');

                table.uuid('assetUuid');
                table.uuid('typeUuid').references('uuid').inTable(INTERNAL_ASSET_TYPE_TABLE).onDelete('CASCADE');

                table
                    .uuid('appUuid')
                    .notNullable()
                    .references('uuid')
                    .inTable(`asset_${appType.replace(/-/g, '_')}`)
                    .onDelete('CASCADE');

                table.string('permission').notNullable();
                table.boolean('grantable').notNullable().defaultTo(false);

                table.primary(['accountUuid', 'appUuid', 'assetUuid', 'permission']);
                table.index(['accountUuid'], 'idx_permission_account');
                table.index(['accountUuid', 'appUuid'], 'idx_acc_app');
                table.index(['accountUuid', 'assetUuid'], 'idx_acc_asset');
                table.index(['accountUuid', 'appUuid', 'permission'], 'idx_acc_app_permission');
            });
        }

        if (!(await this.db.schema.hasTable(INTERNAL_APP_ACCESS_TABLE))) {
            await this.db.schema.createTable(INTERNAL_APP_ACCESS_TABLE, table => {
                table
                    .uuid('appUuid')
                    .notNullable()
                    .references('uuid')
                    .inTable(`asset_${appType.replace(/-/g, '_')}`)
                    .onDelete('CASCADE');
                table.uuid('typeUuid').notNullable().references('uuid').inTable(INTERNAL_ASSET_TYPE_TABLE).onDelete('CASCADE');
                table.boolean('find').notNullable();
                table.boolean('create').notNullable();
                table.boolean('edit').notNullable();
                table.boolean('delete').notNullable();
            });
        }

        if (!(await this.db.schema.hasTable(INTERNAL_PERMISSION_TABLE))) {
            await this.db.schema.createTable(INTERNAL_PERMISSION_TABLE, table => {
                table
                    .uuid('appUuid')
                    .notNullable()
                    .references('uuid')
                    .inTable(`asset_${appType.replace(/-/g, '_')}`)
                    .onDelete('CASCADE');
                table.uuid('typeUuid').references('uuid').inTable(INTERNAL_ASSET_TYPE_TABLE).onDelete('CASCADE');
                table.string('permission').notNullable();
                table.primary(['appUuid', 'permission']);
                table.index(['appUuid'], 'idx_type_permission');
            });
        }

        const signatures: TableIdSignature = {
            Account: 'asset_' + accountType.replaceAll('-', '_'),
            Session: 'asset_' + sessionType.replaceAll('-', '_'),
            App: 'asset_' + appType.replaceAll('-', '_'),
            AuthorizationChallenge: 'asset_' + authChallengeType.replaceAll('-', '_'),
            AuthorizationInstance: 'asset_' + authInstanceType.replaceAll('-', '_'),
            Mirror: 'asset_' + mirrorType.replaceAll('-', '_'),

            AppAccess: INTERNAL_APP_ACCESS_TABLE,
            Permission: INTERNAL_PERMISSION_TABLE,
            AssetType: INTERNAL_ASSET_TYPE_TABLE,
            Grant: INTERNAL_GRANT_TABLE,
        };
        return signatures;
    }

    async createAssetType(
        name: string,
        fields: (Omit<AssetTypeField, 'uuid'> | Omit<AssetTypeRelationField, 'uuid'>)[],
    ): Promise<string | undefined> {
        if (!this.db) throw new Error('Database not connected');

        const exists = await this.db(INTERNAL_ASSET_TYPE_TABLE).where({ name }).first();
        if (exists) {
            this.logger.error(`Asset type "${name}" already exists, skipping creation.`);
            return exists['uuid'];
        }

        // add asset_type entry

        const externalJoinKeys = fields
            .filter((f): f is Omit<AssetTypeRelationField, 'uuid'> => f.type === AssetFieldType.RELATION && !!f.allowMultiple)
            .map(
                f =>
                    f.name +
                    '#' +
                    f.targetAssetType.replaceAll('-', '_') +
                    '#' +
                    (f.required ? '1' : '0') +
                    '#' +
                    f.referentialIntegrityStrategy,
            );
        const [{ uuid }] = await this.db(INTERNAL_ASSET_TYPE_TABLE).insert({ name, externalJoinKeys }).returning('uuid');
        const tableName = `asset_${uuid.replace(/-/g, '_')}`;
        await this.db.schema.createTable(tableName, async table => {
            table.uuid('uuid').primary().defaultTo(this.db!.raw('uuidv7()')); // Primary key
            for (const field of fields) {
                if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(field.name) == false) throw new Error(`Invalid field name: ${field.name}`);

                let column;
                switch (field.type) {
                    case AssetFieldType.VARCHAR:
                        if (field.allowMultiple) column = table.specificType(field.name, 'varchar[]');
                        else column = table.string(field.name);

                        break;
                    case AssetFieldType.BOOLEAN:
                        if (field.allowMultiple) column = table.specificType(field.name, 'boolean[]');
                        else column = table.boolean(field.name);

                        break;
                    case AssetFieldType.INTEGER:
                        if (field.allowMultiple) column = table.specificType(field.name, 'integer[]');
                        else column = table.integer(field.name);

                        break;
                    case AssetFieldType.TEXT:
                        if (field.allowMultiple) column = table.specificType(field.name, 'text[]');
                        else column = table.text(field.name);

                        break;
                    case AssetFieldType.FLOAT8:
                        if (field.allowMultiple) column = table.specificType(field.name, 'float8[]');
                        else column = table.float(field.name);

                        break;
                    case AssetFieldType.DATE:
                        if (field.allowMultiple) column = table.specificType(field.name, 'timestamptz[]');
                        else column = table.timestamp(field.name, { useTz: true });

                        break;
                    case AssetFieldType.RELATION:
                        const relField = field as AssetTypeRelationField;
                        if (!relField.allowMultiple) {
                            column = table
                                .uuid(field.name)
                                .references('uuid')
                                .inTable(`asset_${relField.targetAssetType.replace(/-/g, '_')}`);
                            this.applyOnDeleteStrategy(column, relField);
                        } else {
                            // For multiple relations, we create join table for each relation constraint
                            await this.createJoinTable(uuid, relField.targetAssetType, relField);
                        }

                        break;
                    default:
                        throw new Error(`Unsupported field type: ${field.type}`);
                }
                if (field.required) column.notNullable();
            }
        });
        this.logger.log(`Created table "${tableName}"`);
        return uuid;
    }

    editAssetType(uuid: string, name: string, fields: (AssetTypeField | AssetTypeRelationField)[]): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    deleteAssetType(uuid: string): Promise<boolean> {
        throw new Error('Method not implemented.');
    }

    getAssetTypeFields(uuid: string): Promise<AssetTypeField[]> {
        throw new Error('Method not implemented.');
    }

    async rawQuery<T>(queryString: string): Promise<T[]> {
        if (!this.db) throw new Error('Database not connected');

        const result = await this.db.raw(queryString);
        return result.rows as T[];
    }

    async disconnect() {
        if (this.db) {
            await this.db.destroy();
            this.db = undefined;
            this.logger.log('Disconnected from Postgres database');
        }
    }

    async getAssetTypes(): Promise<AssetType[]> {
        if (!this.db) throw new Error('Database not connected');

        const types: AssetType[] = [];
        const typeRes = await this.db.raw('SELECT * FROM asset_types');

        for (const row of typeRes.rows) {
            // fetch table signature and fields
            const tableName = `asset_${row.uuid.replace(/-/g, '_')}`;

            const genericKeysRes = await this.db.raw(
                `SELECT column_name, data_type, is_nullable, udt_name 
                 FROM information_schema.columns 
                 WHERE table_name = $1`,
                [tableName],
            );
            const genericKeys = genericKeysRes.rows;

            const foreignKeysRes = await this.db.raw(
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

    async getAssetByUuid<T extends Asset>(typeUuid: string, assetUuid: string): Promise<T | null> {
        const tableName = `asset_${typeUuid.replace(/-/g, '_')}`;
        if (!this.db) throw new Error('Database not connected');

        const asset = await this.db(tableName).where({ uuid: assetUuid }).first();
        return asset ? (asset as T) : null;
    }

    private async createJoinTable(sourceTypeUuid: string, targetTypeUuid: string, field: AssetTypeRelationField): Promise<void> {
        // Use the first 16 hex digits (high 64 bits) to keep table name within Postgres 63-byte limit.
        // Format: rel_SOURCE16_TARGET16 (Length: 4 + 16 + 1 + 16 = 37 chars)
        const sourcePart = sourceTypeUuid.replace(/-/g, '').substring(0, 16);
        const targetPart = targetTypeUuid.replace(/-/g, '').substring(0, 16);
        const joinTableName = `rel_${sourcePart}_${targetPart}`;

        if (await this.db!.schema.hasTable(joinTableName)) {
            this.logger.log(`Join table for relations ${joinTableName} already exists, skipping creation.`);
            return;
        }

        await this.db!.schema.createTable(joinTableName, table => {
            const sourceColumn = table
                .uuid('source')
                .notNullable()
                .references('uuid')
                .inTable(`asset_${sourceTypeUuid.replace(/-/g, '_')}`);
            this.applyOnDeleteStrategy(sourceColumn, field);

            const targetColumn = table
                .uuid('target')
                .notNullable()
                .references('uuid')
                .inTable(`asset_${targetTypeUuid.replace(/-/g, '_')}`);
            this.applyOnDeleteStrategy(targetColumn, field);

            table.string('field').notNullable();
            table.primary(['source', 'target', 'field']);
        });
        this.logger.log(`Created join table for relations between "${sourceTypeUuid}" and "${targetTypeUuid}"`);
    }

    private applyOnDeleteStrategy(column: Knex.ReferencingColumnBuilder, field: AssetTypeRelationField): void {
        switch (field.referentialIntegrityStrategy) {
            case 'CASCADE':
                column.onDelete('CASCADE');
                break;
            case 'SET_NULL':
                column.onDelete('SET NULL');
                break;
            case 'RESTRICT':
                column.onDelete('RESTRICT');
                break;
            case 'INVALIDATE':
                // todo no direct equivalent in Postgres, would require triggers
                break;
        }
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

