import { DatabaseGateway } from '@/common/database/database.gateway';
import { Logger } from '@nestjs/common';
import { ASSET_TYPE_TABLE, AssetFieldType, AssetTypeField, AssetTypeRelationField, PERMISSION_TABLE } from '@sigauth/generics/asset';
import knex, { Knex } from 'knex';

export class PostgresDriver implements DatabaseGateway {
    private readonly logger = new Logger(PostgresDriver.name);
    private db?: Knex;

    constructor() {
        this.connect();
    }

    async connect(): Promise<void> {
        if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set in .env!');

        this.db = knex({
            client: 'pg',
            connection: process.env.DATABASE_URL,
        });
        this.logger.log('Connected to Postgres database!');
        await this.initializeSchema();
    }

    private async initializeSchema(): Promise<void> {
        if (!this.db) throw new Error('Database not connected');

        // generate base table to maintain asset types
        if (!(await this.db.schema.hasTable(ASSET_TYPE_TABLE))) {
            await this.db.schema.createTable(ASSET_TYPE_TABLE, table => {
                table.uuid('uuid').primary().defaultTo(this.db!.raw('uuidv7()')); // Primary key
                table.string('name').notNullable().unique();
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
                relationTypeConstraint: [accountType],
                referentialIntegrityStrategy: 'CASCADE',
            },
            { name: 'expire', type: AssetFieldType.INTEGER, required: true }, // todo is there a native way to expire rows in Postgres?
            { name: 'created', type: AssetFieldType.INTEGER, required: true },
        ]);
        if (!sessionType) throw new Error('Failed to create Session asset type during initialization');

        await this.createAssetType('Mirror', [
            { name: 'name', type: AssetFieldType.VARCHAR, required: true },
            { name: 'code', type: AssetFieldType.TEXT, required: true },
            { name: 'autoRun', type: AssetFieldType.BOOLEAN, required: true },
            { name: 'autoRunInterval', type: AssetFieldType.INTEGER },
            { name: 'lastRun', type: AssetFieldType.DATE },
            { name: 'lastResult', type: AssetFieldType.VARCHAR },
        ]);

        const appType = await this.createAssetType('App', [
            { name: 'name', type: AssetFieldType.VARCHAR, required: true },
            { name: 'url', type: AssetFieldType.VARCHAR, required: true },
            { name: 'oidcAuthCodeCb', type: AssetFieldType.VARCHAR },
            { name: 'token', type: AssetFieldType.VARCHAR },
            { name: 'scopes', type: AssetFieldType.VARCHAR, allowMultiple: true },
        ]);
        if (!appType) throw new Error('Failed to create App asset type during initialization');

        await this.createAssetType('AuthorizationInstance', [
            {
                name: 'sessionUuid',
                type: AssetFieldType.RELATION,
                required: true,
                relationTypeConstraint: [sessionType],
                referentialIntegrityStrategy: 'CASCADE',
            },
            {
                name: 'appUuid',
                type: AssetFieldType.RELATION,
                required: true,
                relationTypeConstraint: [appType],
                referentialIntegrityStrategy: 'CASCADE',
            },
            { name: 'refreshToken', type: AssetFieldType.VARCHAR, required: true },
            { name: 'accessToken', type: AssetFieldType.VARCHAR, required: true },
        ]);

        await this.createAssetType('AuthorizationChallenge', [
            {
                name: 'sessionUuid',
                type: AssetFieldType.RELATION,
                required: true,
                relationTypeConstraint: [sessionType],
                referentialIntegrityStrategy: 'CASCADE',
            },
            {
                name: 'appUuid',
                type: AssetFieldType.RELATION,
                required: true,
                relationTypeConstraint: [appType],
                referentialIntegrityStrategy: 'CASCADE',
            },
            { name: 'authCode', type: AssetFieldType.VARCHAR, required: true },
            { name: 'challenge', type: AssetFieldType.VARCHAR, required: true },
            { name: 'redirectUri', type: AssetFieldType.VARCHAR, required: true },
            { name: 'created', type: AssetFieldType.DATE, required: true },
        ]);

        if (!(await this.db.schema.hasTable(PERMISSION_TABLE))) {
            await this.db.schema.createTable(PERMISSION_TABLE, table => {
                table
                    .uuid('account')
                    .notNullable()
                    .references('uuid')
                    .inTable(`asset_${accountType.replace(/-/g, '_')}`)
                    .onDelete('CASCADE');
                table
                    .uuid('app')
                    .notNullable()
                    .references('uuid')
                    .inTable(`asset_${appType.replace(/-/g, '_')}`)
                    .onDelete('CASCADE');
                table.uuid('asset');
                table.string('scope').notNullable();

                table.primary(['account', 'app', 'asset', 'scope']);
                table.index(['account'], 'idx_permission_account');
                table.index(['account', 'app'], 'idx_acc_app');
                table.index(['account', 'asset'], 'idx_acc_asset');
                table.index(['account', 'app', 'scope'], 'idx_acc_app_scope');
            });
        }

        this.logger.log('Initialized database schema');
    }

    async disconnect(): Promise<void> {}

    async rawQuery<T>(queryString: string, params?: any[]): Promise<T[]> {
        return [];
    }

    async createAssetType(
        name: string,
        fields: (Omit<AssetTypeField, 'uuid'> | Omit<AssetTypeRelationField, 'uuid'>)[],
    ): Promise<string | undefined> {
        if (!this.db) throw new Error('Database not connected');

        if (await this.db(ASSET_TYPE_TABLE).where({ name }).first()) {
            this.logger.error(`Asset type "${name}" already exists, skipping creation.`);
            return undefined;
        }

        // add asset_type entry
        const [{ uuid }] = await this.db(ASSET_TYPE_TABLE).insert({ name }).returning('uuid');
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
                        if (!relField.allowMultiple && relField.relationTypeConstraint.length === 1) {
                            column = table
                                .uuid(field.name)
                                .references('uuid')
                                .inTable(`asset_${relField.relationTypeConstraint[0].replace(/-/g, '_')}`);
                            switch (relField.referentialIntegrityStrategy) {
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
                        } else {
                            // For multiple relations, we create join table for each relation constraint
                            for (const targetTypeUuid of relField.relationTypeConstraint) {
                                await this.createJoinTable(uuid, targetTypeUuid);
                            }
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

    private async createJoinTable(sourceTypeUuid: string, targetTypeUuid: string): Promise<void> {
        const joinTableName = `rel_${sourceTypeUuid.replace(/-/g, '_')}_${targetTypeUuid.replace(/-/g, '_')}`;
        await this.db!.schema.createTableIfNotExists(joinTableName, table => {
            table
                .uuid('source')
                .notNullable()
                .references('uuid')
                .inTable(`asset_${sourceTypeUuid.replace(/-/g, '_')}`)
                .onDelete('CASCADE');
            table
                .uuid('target')
                .notNullable()
                .references('uuid')
                .inTable(`asset_${targetTypeUuid.replace(/-/g, '_')}`)
                .onDelete('CASCADE');
            table.string('field').notNullable();
            table.primary(['source', 'target', 'field']);
        });
        this.logger.log(`Created join table for relations between "${sourceTypeUuid}" and "${targetTypeUuid}"`);
    }

    async editAssetType(uuid: string, name: string, fields: any[]): Promise<boolean> {
        return false;
    }

    async deleteAssetType(uuid: string): Promise<boolean> {
        return false;
    }
}
