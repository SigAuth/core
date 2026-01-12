import { DatabaseGateway } from './databse.gateway.js';
import { PostgresDriver } from './postgres.driver.js';

export const DatabaseUtil = {
    DATABASE_DRIVERS: ['pg', 'neo4j'],

    getDriver(flag: string): DatabaseGateway | null {
        let dbGateway: DatabaseGateway | null = null;
        if (flag === 'pg') {
            dbGateway = new PostgresDriver();
        } else if (flag === 'neo4j') {
            // not implemented yet
        }

        return dbGateway;
    },
};
