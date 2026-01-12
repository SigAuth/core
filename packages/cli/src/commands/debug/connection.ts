import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import { DatabaseGateway } from '../../database/databse.gateway.js';
import { DatabaseUtil } from '../../database/databse.util.js';

export default class DbConnect extends Command {
    static description = 'Connects to Datasource using knex and DATABASE_URL from env';

    static flags = {
        driver: Flags.string({
            char: 'd',
            description: 'Database driver to use (e.g., postgres, neo4j)',
            options: DatabaseUtil.DATABASE_DRIVERS,
            required: true,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(DbConnect);

        const spinner = ora('Connecting to database…').start();

        let dbGateway: DatabaseGateway | null = DatabaseUtil.getDriver(flags.driver);
        if (dbGateway === null) {
            spinner.fail(chalk.red('Database connection failed'));
            this.error(`Unsupported driver: ${flags.driver}`);
        }

        try {
            await dbGateway.connect();
            spinner.succeed('Database connection successful');
        } catch (error) {
            spinner.fail(chalk.red('Database connection failed'));
            this.error(error as Error);
        } finally {
            await dbGateway.disconnect();
        }
    }
}
