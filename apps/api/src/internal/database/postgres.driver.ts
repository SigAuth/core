import { TableIdSignature } from '@/internal/client/sigauth.client';
import { DatabaseGateway } from '@/internal/database/database.gateway';
import { Logger } from '@nestjs/common';
import { ASSET_TYPE_TABLE, AssetFieldType, AssetTypeField, AssetTypeRelationField, PERMISSION_TABLE } from '@sigauth/generics/asset';
import knex, { Knex } from 'knex';

export class PostgresDriver extends DatabaseGateway {
    private readonly logger = new Logger(PostgresDriver.name);
    private db?: Knex;

    async connect(): Promise<void> {
        if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set in .env!');

        this.db = knex({
            client: 'pg',
            connection: process.env.DATABASE_URL,
        });
        this.logger.log('Connected to Postgres database!');

        const exists = await this.checkIfInstancedSchemaExists();
        if (!exists) {
            this.logger.log('Instanced schema not found, initializing database schema...');
            await this.initializeSchema();
        } else {
            this.logger.log('Instanced schema found, skipping initialization.');
        }
    }

    private async checkIfInstancedSchemaExists() {
        if (!this.db) throw new Error('Database not connected');

        const signature = this.storage.InstancedSignature;
        if (!signature) return false;

        for (const tableName of Object.values(signature)) {
            const exists = await this.db.schema.hasTable(tableName);
            if (!exists) {
                this.logger.error(`Expected default table "${tableName}" to exist, but it does not.`);
                throw new Error(`Expected default table "${tableName}" to exist, but it does not.`);
            }
        }
        return true;
    }

    private async initializeSchema(): Promise<void> {
        if (!this.db) throw new Error('Database not connected');

        // generate base table to maintain asset types
        if (!(await this.db.schema.hasTable(ASSET_TYPE_TABLE))) {
            await this.db.schema.createTable(ASSET_TYPE_TABLE, table => {
                table.uuid('uuid').primary().defaultTo(this.db!.raw('uuidv7()')); // Primary key
                table.string('name').notNullable().unique();
                table.specificType('externalJoinKeys', 'varchar[]');
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
            { name: 'scopes', type: AssetFieldType.VARCHAR, allowMultiple: true },
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

        const signature: TableIdSignature = {
            Account: 'asset_' + accountType.replaceAll('-', '_'),
            Session: 'asset_' + sessionType.replaceAll('-', '_'),
            App: 'asset_' + appType.replaceAll('-', '_'),
            AuthorizationChallenge: 'asset_' + authChallengeType.replaceAll('-', '_'),
            AuthorizationInstance: 'asset_' + authInstanceType.replaceAll('-', '_'),
            Mirror: 'asset_' + mirrorType.replaceAll('-', '_'),
        };
        this.storage.saveInstancedSignature(signature);
        this.logger.log('Initialized database schema');
    }

    async disconnect(): Promise<void> {
        if (this.db) {
            await this.db.destroy();
            this.db = undefined;
            this.logger.log('Disconnected from Postgres database');
        }
    }

    async rawQuery<T>(queryString: string, params?: any[]): Promise<T[]> {
        if (!this.db) throw new Error('Database not connected');

        const result = await this.db.raw(queryString);
        return result.rows as T[];
    }

    async createAssetType(
        name: string,
        fields: (Omit<AssetTypeField, 'uuid'> | Omit<AssetTypeRelationField, 'uuid'>)[],
    ): Promise<string | undefined> {
        if (!this.db) throw new Error('Database not connected');

        const exists = await this.db(ASSET_TYPE_TABLE).where({ name }).first();
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
        const [{ uuid }] = await this.db(ASSET_TYPE_TABLE).insert({ name, externalJoinKeys }).returning('uuid');
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

    async editAssetType(uuid: string, name: string, fields: any[]): Promise<boolean> {
        return false;
    }

    async deleteAssetType(uuid: string): Promise<boolean> {
        return false;
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
}
