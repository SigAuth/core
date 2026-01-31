import { GenericLogger } from 'src/logger/logger.abstract.js';
import { GenericDatabaseGateway } from './database.gateway.js';
import { GenericPostgresDriver } from './postgres.driver.js';

export const DatabaseUtil = {
    DATABASE_DRIVERS: ['pg', 'neo4j'],

    getDriver(connectionString: string): GenericDatabaseGateway | null {
        let dbGateway: GenericDatabaseGateway | null = null;
        if (connectionString.startsWith('postgresql://')) {
            dbGateway = new GenericPostgresDriver(this.createBasicLogger());
        } else if (connectionString.startsWith('neo4j://')) {
            // not implemented yet
        }

        return dbGateway;
    },
    createBasicLogger(): GenericLogger {
        const logger = {} as any;
        const levels = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'];

        levels.forEach(level => {
            logger[level] = (message: string, ...optionalParams: any[]) => {
                console.log(`[${level.toUpperCase()}] ${message}`, ...optionalParams);
            };
        });

        return logger as GenericLogger;
    },
};

