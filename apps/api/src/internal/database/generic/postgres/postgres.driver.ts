import { ASSET_TYPE_CHANGE_EVENT, GenericDatabaseGateway } from '@/internal/database/generic/database.gateway';
import { StorageService } from '@/internal/database/storage.service';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    Asset,
    AssetFieldType,
    AssetTypeField,
    AssetTypeRelationField,
    DefinitiveAssetType,
    INTERNAL_APP_ACCESS_TABLE,
    INTERNAL_ASSET_TYPE_TABLE,
    INTERNAL_GRANT_TABLE,
    INTERNAL_PERMISSION_TABLE,
    RelationalIntegrityStrategy,
    SELF_REFERENCE_ASSET_TYPE_UUID,
} from '@sigauth/sdk/architecture';
import { getMappedFields, RegistryConfigs } from '@sigauth/sdk/fundamentals';
import { AssetTypeTableMapping } from '@sigauth/sdk/protected';
import knex, { Knex } from 'knex';
import { GlobalRealtionMap, Model } from '../orm-client/sigauth.client';
import { ModelPG } from './postgres.model';

@Injectable()
export class PostgresDriver extends GenericDatabaseGateway {
    private db?: Knex;
    private mapping?: AssetTypeTableMapping;

    constructor(
        private readonly storage: StorageService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        super(PostgresDriver.name);
    }

    public getModel<T extends Record<string, any>>(tableName: string, relations: GlobalRealtionMap, db: GenericDatabaseGateway): Model<T> {
        return new ModelPG<T>(tableName, relations, db);
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    async connect(connectionString: string) {
        if (!this.connect && !process.env.DATABASE_URL) throw new Error('DATABASE_URL not set in env');

        this.db = knex({
            client: 'pg',
            connection: process.env.DATABASE_URL,
        });
        this.logger.log('Connected to Postgres database!');

        await this.generateAssetTypeTableMapping();
        const exists = await this.checkIfInstancedSchemaExists();
        if (!exists) {
            this.logger.log('Instanced schema not found, initializing database schema...');
            this.mapping = await this.initializeSchema();

            this.logger.log('Initialized database schema');
        } else {
            this.logger.log('Instanced schema found, skipping initialization.');
        }
    }

    private async checkIfInstancedSchemaExists() {
        if (!this.db) throw new Error('Database not connected');

        if (!this.mapping) return false;
        for (const tableName of Object.values(this.mapping)) {
            const exists = await this.db.schema.hasTable(tableName);
            if (!exists) {
                this.logger.error(`Expected default table "${tableName}" to exist, but it does not.`);
                throw new Error(`Expected default table "${tableName}" to exist, but it does not.`);
            }
        }
        return true;
    }

    async initializeSchema(): Promise<AssetTypeTableMapping> {
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
        const mapping: Partial<AssetTypeTableMapping> = {
            AssetType: INTERNAL_ASSET_TYPE_TABLE,
            Grant: INTERNAL_GRANT_TABLE,
            AppAccess: INTERNAL_APP_ACCESS_TABLE,
            Permission: INTERNAL_PERMISSION_TABLE,
        };

        const accountType = await this.createAssetType('Account', getMappedFields(mapping, RegistryConfigs.Account));
        if (!accountType) throw new Error('Failed to create Account asset type during initialization');
        mapping.Account = 'asset_' + accountType;

        const sessionType = await this.createAssetType('Session', getMappedFields(mapping, RegistryConfigs.Session));
        if (!sessionType) throw new Error('Failed to create Session asset type during initialization');
        mapping.Session = 'asset_' + sessionType;

        const appType = await this.createAssetType('App', getMappedFields(mapping, RegistryConfigs.App));
        if (!appType) throw new Error('Failed to create App asset type during initialization');
        mapping.App = 'asset_' + appType;

        const scope = await this.createAssetType('AppScope', getMappedFields(mapping, RegistryConfigs.AppScope));
        if (!scope) throw new Error('Failed to create AppScope asset type during initialization');
        mapping.AppScope = 'asset_' + scope;

        const authInstanceType = await this.createAssetType(
            'AuthorizationInstance',
            getMappedFields(mapping, RegistryConfigs.AuthorizationInstance),
        );
        if (!authInstanceType) throw new Error('Failed to create AuthorizationInstance asset type during initialization');
        mapping.AuthorizationInstance = 'asset_' + authInstanceType;

        const authChallengeType = await this.createAssetType(
            'AuthorizationChallenge',
            getMappedFields(mapping, RegistryConfigs.AuthorizationChallenge),
        );
        if (!authChallengeType) throw new Error('Failed to create AuthorizationChallenge asset type during initialization');
        mapping.AuthorizationChallenge = 'asset_' + authChallengeType;

        if (!(await this.db.schema.hasTable(INTERNAL_GRANT_TABLE))) {
            await this.db.schema.createTable(INTERNAL_GRANT_TABLE, table => {
                table.uuid('accountUuid').notNullable().references('uuid').inTable(`asset_${accountType}`).onDelete('CASCADE');

                table.uuid('assetUuid');
                table.uuid('typeUuid').references('uuid').inTable(INTERNAL_ASSET_TYPE_TABLE).onDelete('CASCADE');

                table.uuid('appUuid').notNullable().references('uuid').inTable(`asset_${appType}`).onDelete('CASCADE');

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
                table.uuid('appUuid').notNullable().references('uuid').inTable(`asset_${appType}`).onDelete('CASCADE');
                table.uuid('typeUuid').notNullable().references('uuid').inTable(INTERNAL_ASSET_TYPE_TABLE).onDelete('CASCADE');
                table.boolean('find').notNullable();
                table.boolean('create').notNullable();
                table.boolean('edit').notNullable();
                table.boolean('delete').notNullable();
            });
        }

        if (!(await this.db.schema.hasTable(INTERNAL_PERMISSION_TABLE))) {
            await this.db.schema.createTable(INTERNAL_PERMISSION_TABLE, table => {
                table.uuid('appUuid').notNullable().references('uuid').inTable(`asset_${appType}`).onDelete('CASCADE');
                table.uuid('typeUuid').references('uuid').inTable(INTERNAL_ASSET_TYPE_TABLE).onDelete('CASCADE');
                table.string('permission').notNullable();
                table.primary(['appUuid', 'permission']);
                table.index(['appUuid'], 'idx_type_permission');
            });
        }

        return mapping as AssetTypeTableMapping;
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
            .map(f => f.name + '#' + f.targetAssetType + '#' + (f.required ? '1' : '0') + '#' + f.referentialIntegrityStrategy);
        const [{ uuid }] = await this.db(INTERNAL_ASSET_TYPE_TABLE).insert({ name, externalJoinKeys }).returning('uuid');
        const tableName = `asset_${uuid}`;
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
                            column = table.uuid(field.name).references('uuid').inTable(`asset_${relField.targetAssetType}`);
                            this.applyOnDeleteStrategy(column, relField);
                        } else {
                            // For multiple relations, we create join table for each relation constraint
                            await this.createJoinTable(uuid, relField.targetAssetType, relField);
                        }

                        break;
                    default:
                        throw new Error(`Unsupported field type: ${field.type}`);
                }
                if (field.required && field.type != AssetFieldType.RELATION) column.notNullable();
            }
        });
        this.logger.log(`Created table "${tableName}"`);
        await this.eventEmitter.emitAsync(ASSET_TYPE_CHANGE_EVENT);
        return uuid;
    }

    async editAssetType(
        uuid: string,
        name: string,
        fields: ((AssetTypeField | AssetTypeRelationField) & { originalName?: string })[],
    ): Promise<DefinitiveAssetType> {
        const type = await this.getAssetType(uuid);
        if (!type) throw new Error('Asset type not found');

        // Update name if changed
        if (name !== type.name) {
            await this.db!.table(INTERNAL_ASSET_TYPE_TABLE).where({ uuid }).update({ name });
        }

        const tableName = `asset_${uuid}`;
        const existingFieldsMap = new Map(type.fields.map(f => [f.name, f]));
        const processedOldFields = new Set<string>();
        const newExternalKeys: string[] = [];

        // Process all input fields (Updates & Creations)
        for (const newField of fields) {
            const oldField = newField.originalName ? existingFieldsMap.get(newField.originalName) : undefined;
            if (newField.originalName && !oldField) throw new Error();

            const isNewExternal = newField.type === AssetFieldType.RELATION && newField.allowMultiple;

            // Track External Keys for metadata update
            if (isNewExternal) {
                const f = newField as AssetTypeRelationField;
                newExternalKeys.push(
                    f.name +
                        '#' +
                        f.targetAssetType +
                        '#' +
                        (f.required ? '1' : '0') +
                        '#' +
                        (f.referentialIntegrityStrategy || RelationalIntegrityStrategy.CASCADE),
                );
            }

            if (oldField) {
                processedOldFields.add(oldField.name);
                const isOldExternal = oldField.type === AssetFieldType.RELATION && oldField.allowMultiple;

                if (isOldExternal && isNewExternal) {
                    // Update External Relation (Rename only)
                    const oldRel = oldField as AssetTypeRelationField;
                    const joinTable = this.getJoinTableName(uuid, oldRel.targetAssetType);

                    if (newField.name !== oldField.name) {
                        if (await this.db!.schema.hasTable(joinTable)) {
                            await this.db!(joinTable).where({ field: newField.name }).update({ field: newField.name });
                        }
                    }
                } else if (!isOldExternal && !isNewExternal) {
                    // Update Column Name
                    if (newField.name !== oldField.name) {
                        await this.db!.schema.alterTable(tableName, table => {
                            table.renameColumn(oldField.name, newField.name);
                        });
                    }

                    // Update Column Type/Constraints
                    if (newField.type !== oldField.type || newField.required !== oldField.required) {
                        await this.db!.schema.alterTable(tableName, table => {
                            const col = this.addColumnToTable(table, newField);
                            if (col) {
                                col.alter();
                                if (newField.type !== oldField.type) {
                                    switch (newField.type) {
                                        case AssetFieldType.VARCHAR:
                                            col.defaultTo('');
                                            break;
                                        case AssetFieldType.INTEGER:
                                            col.defaultTo(0);
                                            break;
                                        case AssetFieldType.FLOAT8:
                                            col.defaultTo(0.0);
                                            break;
                                        case AssetFieldType.BOOLEAN:
                                            col.defaultTo(false);
                                            break;
                                        case AssetFieldType.TEXT:
                                            col.defaultTo('');
                                            break;
                                        case AssetFieldType.DATE:
                                            col.defaultTo(this.db!.fn.now());
                                            break;
                                    }
                                }
                            }
                        });
                    }
                } else if (isOldExternal && !isNewExternal) {
                    // Conversion: External Relation -> Column
                    const oldRel = oldField as AssetTypeRelationField;
                    const joinTable = this.getJoinTableName(uuid, oldRel.targetAssetType);

                    if (await this.db!.schema.hasTable(joinTable)) {
                        await this.db!(joinTable).where({ field: oldField.name }).del();
                    }

                    await this.db!.schema.alterTable(tableName, table => {
                        this.addColumnToTable(table, newField);
                    });
                } else if (!isOldExternal && isNewExternal) {
                    // Conversion: Column -> External Relation
                    await this.db!.schema.alterTable(tableName, table => {
                        table.dropColumn(oldField.name);
                    });

                    const f = newField as AssetTypeRelationField;
                    await this.createJoinTable(uuid, f.targetAssetType, f);
                }
            } else {
                // New Field
                if (isNewExternal) {
                    const f = newField as AssetTypeRelationField;
                    await this.createJoinTable(uuid, f.targetAssetType, f);
                } else {
                    await this.db!.schema.alterTable(tableName, table => {
                        this.addColumnToTable(table, newField);
                    });
                }
            }
        }

        // Process Deletions (Fields present in existing but not in input)
        for (const oldField of type.fields) {
            if (!processedOldFields.has(oldField.name)) {
                if (oldField.type === AssetFieldType.RELATION && oldField.allowMultiple) {
                    const oldRel = oldField as AssetTypeRelationField;
                    const joinTable = this.getJoinTableName(uuid, oldRel.targetAssetType);
                    if (await this.db!.schema.hasTable(joinTable)) {
                        await this.db!(joinTable).where({ field: oldField.name }).del();
                    }
                } else {
                    await this.db!.schema.alterTable(tableName, table => {
                        table.dropColumn(oldField.name);
                    });
                }
            }
        }

        // Update metadata
        await this.db!.table(INTERNAL_ASSET_TYPE_TABLE).where({ uuid }).update({ externalJoinKeys: newExternalKeys });

        // Garbage collect unused Join Tables
        // Check all existing join tables starting with this source UUID
        const sourcePart = this.getJoinTablePart(uuid);
        const relTables = await this.db!.select('tablename').from('pg_tables').where('schemaname', 'public');

        for (const { tablename } of relTables) {
            const expectedStart = `rel_${sourcePart}_`;
            if (!tablename.startsWith(expectedStart)) continue;
            const targetSimple = tablename.substring(expectedStart.length);

            // Check if this relationship is still required by ANY field in the updated keys
            const isUsed = newExternalKeys.some(k => {
                const parts = k.split('#');
                const tUuidSimple = this.getJoinTablePart(parts[1]);
                return tUuidSimple === targetSimple;
            });

            if (!isUsed) {
                this.logger.log(`Dropping unused relation table ${tablename}`);
                await this.db!.schema.dropTable(tablename);
            }
        }

        await this.eventEmitter.emitAsync(ASSET_TYPE_CHANGE_EVENT);
        return (await this.getAssetType(uuid))!;
    }

    // Use the last 16 hex digits of uuid v7 to keep table name within Postgres 63-byte limit and ensure uniqueness.
    private getJoinTablePart(uuid: string): string {
        return uuid.replace(/_/g, '').replace(/-/g, '').substring(16);
    }

    // Format: rel_SOURCE16_TARGET16 (Length: 4 + 16 + 1 + 16 = 37 chars)
    private getJoinTableName(sourceUuid: string, targetUuid: string): string {
        const sourcePart = this.getJoinTablePart(sourceUuid);
        const targetPart = this.getJoinTablePart(targetUuid);
        return `rel_${sourcePart}_${targetPart}`;
    }

    // Updated helper to return the column builder
    private addColumnToTable(
        table: Knex.CreateTableBuilder | Knex.TableBuilder,
        field: AssetTypeField | AssetTypeRelationField,
    ): Knex.ColumnBuilder | undefined {
        let column: Knex.ColumnBuilder | undefined;
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
                    const refColumn = table.uuid(field.name).references('uuid').inTable(`asset_${relField.targetAssetType}`);
                    this.applyOnDeleteStrategy(refColumn, relField);
                    column = refColumn as unknown as Knex.ColumnBuilder;
                }
                break;
            default:
                throw new Error(`Unsupported field type: ${field.type}`);
        }
        if (column && field.required) column.notNullable();
        return column;
    }

    async deleteAssetType(uuid: string) {
        if (!this.db) throw new Error('Database not connected');

        const allTypes = await this.getAssetTypes();
        const blockingTypes = allTypes.filter(type =>
            type.fields.some(
                (field): field is AssetTypeRelationField =>
                    field.type === AssetFieldType.RELATION && (field as AssetTypeRelationField).targetAssetType === uuid,
            ),
        );

        if (blockingTypes.length > 0) {
            const names = blockingTypes.map(type => type.name).join(', ');
            throw new Error(`Cannot delete asset type ${uuid}; referenced by: ${names}`);
        }

        const tableName = `asset_${uuid}`;
        const assetUuids = await this.db.table(tableName).count('uuid as count');
        this.logger.log(`Deleting asset type table ${tableName} with ${assetUuids[0].count} assets`);

        const allRelTablesNames = await this.db!.select('table_name')
            .from('information_schema.tables')
            .where('table_schema', 'public') // Falls du ein anderes Schema nutzt, hier anpassen
            .andWhere('table_name', 'like', 'rel_%');

        for (const relTable of allRelTablesNames) {
            if (relTable.table_name.includes(this.getJoinTablePart(uuid))) {
                this.logger.log(`Dropping relation table ${relTable.table_name} related to asset type ${uuid}`);
                await this.db.schema.dropTable(relTable.table_name);
            }
        }

        await this.db.table(INTERNAL_ASSET_TYPE_TABLE).where({ uuid }).del();
        await this.db.schema.dropTableIfExists(tableName);
        await this.eventEmitter.emitAsync(ASSET_TYPE_CHANGE_EVENT);
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

    async createAsset<T extends Asset>(assetType: DefinitiveAssetType, fields: Record<string, any>): Promise<T> {
        if (!this.db) throw new Error('Database not connected');
        if (Object.keys(fields).some(k => k === 'uuid')) throw new Error('Cannot set uuid field when creating asset, it is auto-generated');
        const tableName = `asset_${assetType.uuid}`;

        // TODO filter externalKEys and create join table entries
        const externalFields = assetType.fields.filter(
            (f): f is AssetTypeRelationField => f.type === AssetFieldType.RELATION && !!f.allowMultiple,
        );

        const asset = await this.db(tableName)
            .insert(Object.fromEntries(Object.entries(fields).filter(([key]) => !externalFields.find(f => f.name === key))))
            .returning('*')
            .then(results => results[0] as T);

        // handle join tables
        for (const field of externalFields) {
            const joinTable = this.getJoinTableName(assetType.uuid, field.targetAssetType);
            const relatedUuids: string[] = fields[field.name] || [];

            for (const targetUuid of relatedUuids) {
                await this.db(joinTable).insert({
                    source: asset.uuid,
                    target: targetUuid,
                    field: field.name,
                });
            }
        }

        return (await this.getAssetByUuid<T>(assetType.uuid, asset.uuid)) as T;
    }

    async updateAsset<T extends Asset>(assetType: DefinitiveAssetType, assetUuid: string, fields: Record<string, any>): Promise<T> {
        if (!this.db) throw new Error('Database not connected');
        if (Object.keys(fields).some(k => k === 'uuid')) throw new Error('Cannot update uuid field of an asset');

        const tableName = `asset_${assetType.uuid}`;
        const updateData: Record<string, any> = { ...fields };

        const asset = await this.db(tableName)
            .where({ uuid: assetUuid })
            .update(updateData)
            .returning('*')
            .then(results => {
                if (results.length === 0) throw new Error(`Asset with UUID ${assetUuid} not found`);
                return results[0] as T;
            });

        // handle join tables
        const externalFields = assetType.fields.filter(
            (f): f is AssetTypeRelationField => f.type === AssetFieldType.RELATION && !!f.allowMultiple,
        );
        for (const field of externalFields) {
            const joinTable = this.getJoinTableName(assetType.uuid, field.targetAssetType);
            const relatedUuids: string[] = fields[field.name] || [];

            // TODO optimize this process by calculating diffs
            // First, delete existing relations for this asset and field
            await this.db(joinTable).where({ source: assetUuid, field: field.name }).del();

            // Then, insert the new relations
            for (const targetUuid of relatedUuids) {
                await this.db(joinTable).insert({
                    source: assetUuid,
                    target: targetUuid,
                    field: field.name,
                });
            }
        }

        return asset;
    }

    async deleteAsset(assetType: DefinitiveAssetType, assetUuid: string): Promise<boolean> {
        if (!this.db) throw new Error('Database not connected');
        const tableName = `asset_${assetType.uuid}`;

        // delete in join tables handled by foreign key constraints
        const externalFields = assetType.fields.filter(
            (f): f is AssetTypeRelationField => f.type === AssetFieldType.RELATION && !!f.allowMultiple,
        );
        for (const field of externalFields) {
            const joinTable = this.getJoinTableName(assetType.uuid, field.targetAssetType);
            // delete existing relations for this asset and field
            await this.db(joinTable).where({ source: assetUuid, field: field.name }).del();
        }

        await this.db.table(INTERNAL_GRANT_TABLE).where({ assetUuid, typeUuid: assetType.uuid }).del();

        return this.db(tableName)
            .where({ uuid: assetUuid })
            .del()
            .then(count => count > 0);
    }

    getAssetsByType<T extends Asset>(typeUuid: string): Promise<T[]> {
        if (!this.db) throw new Error('Database not connected');
        const tableName = `asset_${typeUuid}`;

        return this.db(tableName).select('*') as Promise<T[]>;
    }

    async getAssetTypeFields(uuid: string, externalJoinKeys?: string[]): Promise<AssetTypeField[]> {
        if (!this.db) throw new Error('Database not connected');
        const tableName = `asset_${uuid}`;

        const genericKeysRes = await this.db.raw(
            `SELECT column_name, data_type, is_nullable, udt_name 
                 FROM information_schema.columns 
                 WHERE table_name = ?`,
            [tableName],
        );
        const genericKeys = genericKeysRes.rows;

        const foreignKeysRes = await this.db.raw(
            `SELECT kcu.column_name, ccu.table_name as foreign_table_name, rc.delete_rule as on_delete
                 FROM information_schema.key_column_usage as kcu
                 JOIN information_schema.referential_constraints as rc ON kcu.constraint_name = rc.constraint_name
                 JOIN information_schema.constraint_column_usage as ccu ON rc.unique_constraint_name = ccu.constraint_name
                 WHERE kcu.table_name = ?`,
            [tableName],
        );
        const foreignKeys = foreignKeysRes.rows;
        const fields: AssetTypeField[] = [];

        for (const key of genericKeys) {
            if (key.column_name === 'uuid') continue; // skip primary key because only custom fields are relevant
            const foreignKey = foreignKeys.find((fk: any) => fk.column_name === key.column_name);

            const field: AssetTypeField = {
                name: key.column_name,
                type: foreignKey ? AssetFieldType.RELATION : this.mapPostgresTypeToAssetFieldType(key.udt_name),
                required: key.is_nullable === 'NO',
                allowMultiple: key.data_type.startsWith('ARRAY'),
            };

            if (foreignKey) {
                (field as AssetTypeRelationField).referentialIntegrityStrategy = foreignKey.on_delete;
                (field as AssetTypeRelationField).targetAssetType = foreignKey.foreign_table_name.replace('asset_', '');
            }
            fields.push(field);
        }

        // check for join tables
        if (externalJoinKeys) {
            for (const externalJoinKey of externalJoinKeys) {
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
        return fields;
    }

    async getAssetType(uuid: string): Promise<DefinitiveAssetType | null> {
        if (!this.db) throw new Error('Database not connected');

        const typeRow = (await this.db.raw(`SELECT * FROM ?? WHERE uuid = ?`, [INTERNAL_ASSET_TYPE_TABLE, uuid])).rows[0];

        if (!typeRow) return null;

        return {
            uuid: typeRow.uuid,
            name: typeRow.name,
            fields: await this.getAssetTypeFields(typeRow.uuid, typeRow.externalJoinKeys),
        };
    }

    async getAssetTypes(): Promise<DefinitiveAssetType[]> {
        if (!this.db) throw new Error('Database not connected');

        const types: DefinitiveAssetType[] = [];
        const typeRes = await this.db.raw(`SELECT * FROM ??`, [INTERNAL_ASSET_TYPE_TABLE]);

        for (const row of typeRes.rows) {
            types.push({
                uuid: row.uuid,
                name: row.name,
                fields: await this.getAssetTypeFields(row.uuid, row.externalJoinKeys),
            });
        }

        return types;
    }

    async getAssetByUuid<T extends Asset>(typeUuid: string, assetUuid: string): Promise<T | null> {
        const tableName = `asset_${typeUuid}`;
        if (!this.db) throw new Error('Database not connected');

        const asset = await this.db(tableName).where({ uuid: assetUuid }).first();
        if (!asset) return null;

        const assetType = await this.db(INTERNAL_ASSET_TYPE_TABLE).where({ uuid: typeUuid }).first();
        if (!assetType) throw new Error('Asset type not found for asset');
        const externalJoinKeys: string[] = assetType.externalJoinKeys || [];

        for (const key of externalJoinKeys) {
            const [fieldName, targetAssetType] = key.split('#');
            const joinTable = this.getJoinTableName(typeUuid, targetAssetType);

            const relations = await this.db(joinTable).select('target').where({
                source: assetUuid,
                field: fieldName,
            });

            (asset as any)[fieldName] = relations.map((row: any) => row.target);
        }

        return asset as T;
    }

    private async createJoinTable(sourceTypeUuid: string, targetTypeUuid: string, field: AssetTypeRelationField): Promise<void> {
        const joinTable = this.getJoinTableName(sourceTypeUuid, targetTypeUuid);

        if (await this.db!.schema.hasTable(joinTable)) {
            this.logger.log(`Join table for relations ${joinTable} already exists, skipping creation.`);
            return;
        }

        await this.db!.schema.createTable(joinTable, table => {
            const sourceColumn = table.uuid('source').references('uuid').inTable(`asset_${sourceTypeUuid}`);
            this.applyOnDeleteStrategy(sourceColumn, field);

            const targetColumn = table.uuid('target').references('uuid').inTable(`asset_${targetTypeUuid}`);
            this.applyOnDeleteStrategy(targetColumn, field);

            // A join table row cannot have a null target because that would not make sense in the context of a relation,
            // so we use CASCADE to ensure referential integrity. If the target asset is deleted, the relation should be deleted as well.
            if (field.referentialIntegrityStrategy === 'SET_NULL') {
                targetColumn.onDelete('CASCADE');
            } else {
                this.applyOnDeleteStrategy(targetColumn, field);
            }

            table.string('field').notNullable();
            table.primary(['source', 'target', 'field']);
        });
        this.logger.log(`Created join table for relations between "${sourceTypeUuid}" and "${targetTypeUuid}"`);
    }

    async generateAssetTypeTableMapping(refetch?: boolean): Promise<AssetTypeTableMapping> {
        if (!this.mapping || refetch) {
            if (!this.db) throw new Error('Database not connected');
            if (!(await this.db.schema.hasTable(INTERNAL_ASSET_TYPE_TABLE))) return {} as any;

            const types = await this.getAssetTypes();
            const mapping: Partial<AssetTypeTableMapping> = {};
            for (const assetType of types) {
                mapping[assetType.name] = 'asset_' + assetType.uuid;
            }

            mapping['Grant'] = INTERNAL_GRANT_TABLE;
            mapping['AppAccess'] = INTERNAL_APP_ACCESS_TABLE;
            mapping['Permission'] = INTERNAL_PERMISSION_TABLE;
            mapping['AssetType'] = INTERNAL_ASSET_TYPE_TABLE;
            this.mapping = mapping as AssetTypeTableMapping;
        }

        return this.mapping;
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
