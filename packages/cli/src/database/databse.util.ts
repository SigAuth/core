import { DatabaseGateway } from './databse.gateway.js';
import { PostgresDriver } from './postgres.driver.js';

export const DatabaseUtil = {
    DATABASE_DRIVERS: ['pg', 'neo4j'],

    getDriver(connectionString: string): DatabaseGateway | null {
        let dbGateway: DatabaseGateway | null = null;
        if (connectionString.startsWith('postgres://')) {
            dbGateway = new PostgresDriver();
        } else if (connectionString.startsWith('neo4j://')) {
            // not implemented yet
        }

        return dbGateway;
    },
};
