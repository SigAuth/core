import { GenericDatabaseGateway } from '@/internal/database/generic/database.gateway';
import { PostgresDriver } from '@/internal/database/generic/postgres.driver';
import { ORMService } from '@/internal/database/orm.client';
import { StorageService } from '@/internal/database/storage.service';
import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Global()
@Module({
    imports: [EventEmitterModule.forRoot()],
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

