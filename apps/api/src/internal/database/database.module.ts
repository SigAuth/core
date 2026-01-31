import { ORMService } from '@/internal/database/orm.client';
import { PostgresDriver } from '@/internal/database/postgres.driver';
import { StorageService } from '@/internal/database/storage.service';
import { Global, Module } from '@nestjs/common';
import { GenericDatabaseGateway } from '@sigauth/generics/database/database.gateway';

@Global() // skips the need to import in other moduless
@Module({
    providers: [
        {
            provide: GenericDatabaseGateway,
            useClass: PostgresDriver, // dynamically pick Neo4J or Postgres Driver
        },
        StorageService,
        ORMService,
    ],
    exports: [GenericDatabaseGateway, StorageService, ORMService],
})
export class DatabaseModule {}

