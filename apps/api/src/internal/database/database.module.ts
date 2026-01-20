import { DatabaseGateway } from '@/internal/database/database.gateway';
import { ORMService } from '@/internal/database/orm.client';
import { PostgresDriver } from '@/internal/database/postgres.driver';
import { StorageService } from '@/internal/database/storage.service';
import { Global, Module } from '@nestjs/common';

@Global() // skips the need to import in other moduless
@Module({
    providers: [
        {
            provide: DatabaseGateway,
            useClass: PostgresDriver, // this needs to be dynamic in the future
        },
        StorageService,
        ORMService,
    ],
    exports: [DatabaseGateway, StorageService, ORMService],
})
export class DatabaseModule {}
