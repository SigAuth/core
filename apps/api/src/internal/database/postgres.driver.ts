import { StorageService } from '@/internal/database/storage.service';
import { Injectable, Logger } from '@nestjs/common';
import { GenericPostgresDriver } from '@sigauth/generics/database/postgres.driver';

@Injectable()
export class PostgresDriver extends GenericPostgresDriver {
    private readonly storage: StorageService;

    constructor(private readonly _storage: StorageService) {
        const logger = new Logger(PostgresDriver.name);
        super(logger);

        this.storage = _storage;
    }

    async connect(connectionString: string): Promise<void> {
        super.connect(connectionString);

        const exists = await this.checkIfInstancedSchemaExists();
        if (!exists) {
            this.logger.log('Instanced schema not found, initializing database schema...');
            const signatures = await this.initializeSchema();

            this.storage.saveConfigFile({ signatures });
            this.logger.log('Initialized database schema');
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
}

