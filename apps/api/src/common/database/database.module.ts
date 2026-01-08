import { DatabaseGateway } from '@/common/database/database.gateway';
import { PostgresDriver } from '@/common/database/postgres.driver';
import { Global, Module } from '@nestjs/common';

@Global() // skips the need to import in other moduless
@Module({
    providers: [
        {
            provide: DatabaseGateway,
            useClass: PostgresDriver, // this needs to be dynamic in the future
        },
    ],
    exports: [DatabaseGateway],
})
export class DatabaseModule {}
