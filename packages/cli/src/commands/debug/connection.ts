import { Command } from '@oclif/core';
import chalk from 'chalk';
import dotenv from 'dotenv';
import ora from 'ora';
import { DatabaseGateway } from '../../database/database.gateway.js';
import { DatabaseUtil } from '../../database/databse.util.js';

export default class DbConnect extends Command {
    static description = 'Connects to Datasource using knex and DATABASE_URL from env';

    async run(): Promise<void> {
        const spinner = ora('Connecting to database…').start();

        dotenv.config();

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            throw new Error('DATABASE_URL not set in env');
        }

        let dbGateway: DatabaseGateway | null = DatabaseUtil.getDriver(dbUrl);
        if (dbGateway === null) {
            spinner.fail(chalk.red('Database connection failed'));
            this.error(`Unsupported driver: ${dbUrl}`);
        }

        try {
            await dbGateway.connect(dbUrl);
            spinner.succeed('Database connection successful');
        } catch (error) {
            spinner.fail(chalk.red('Database connection failed'));
            this.error(error as Error);
        } finally {
            await dbGateway.disconnect();
        }
    }
}
