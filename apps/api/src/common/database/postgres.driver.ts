import { DatabaseGateway } from '@/common/database/database.gateway';
import { Logger } from '@nestjs/common';
import { AssetTypeField, AssetTypeRelationField } from '@sigauth/generics/asset';
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
        await this.db.schema.createTableIfNotExists('asset_types', table => {
            table.uuid('uuid').primary().defaultTo(this.db!.raw('uuidv7()')); // Primary key
            table.string('name').notNullable().unique();
        });

        // await this.createAssetType('Account', [
        //     { name: 'username', type: AssetFieldType.STRING, required: true },
        //     { name: 'email', type: AssetFieldType.STRING, required: true },
        //     { name: 'api', type: AssetFieldType.STRING, required: false },
        //     { name: '2faCode', type: AssetFieldType.STRING, required: false },
        //     { name: 'deactivated', type: AssetFieldType.BOOLEAN, required: true },
        //     { name: 'passwordHash', type: AssetFieldType.STRING, required: true },
        // ]);
        this.logger.log('Initialized database schema');
    }

    async disconnect(): Promise<void> {}

    async query<T>(queryString: string, params?: any[]): Promise<T[]> {
        return [];
    }

    async createAssetType(name: string, fields: (Partial<AssetTypeField> | Partial<AssetTypeRelationField>)[]): Promise<any> {
        // if (!this.db) throw new Error('Database not connected');
        // const tableName = name.toLowerCase();
        // const exists = await this.db.schema.hasTable(tableName);
        // if (exists) {
        //     this.logger.log(`Table "${tableName}" already exists, skipping creation.`);
        //     return;
        // }
        // await this.db.schema.createTable(tableName, table => {
        //     table.uuid('id').primary().defaultTo(this.db!.raw('uuid_generate_v7()')); // Primary key
        //     for (const field of fields) {
        //         let column;
        //         switch (field.type) {
        //             case AssetFieldType.STRING:
        //                 column = table.string(field.name);
        //                 break;
        //             case AssetFieldType.BOOLEAN:
        //                 column = table.boolean(field.name);
        //                 break;
        //             case AssetFieldType.NUMBER:
        //                 column = table.float(field.name);
        //                 break;
        //             case AssetFieldType.DATE:
        //                 column = table.timestamp(field.name);
        //                 break;
        //             default:
        //                 throw new Error(`Unsupported field type: ${field.type}`);
        //         }
        //         if (field.required) column.notNullable();
        //     }
        //     table.timestamps(true, true); // created_at, updated_at
        // });
        // this.logger.log(`Created table "${tableName}"`);
    }

    async editAssetType(uuid: string, name: string, fields: any[]): Promise<any> {
        return {} as any;
    }

    async deleteAssetType(uuid: string): Promise<void> {}
}
