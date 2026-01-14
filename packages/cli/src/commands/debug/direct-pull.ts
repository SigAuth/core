import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import { DatabaseGateway } from '../../database/databse.gateway.js';
import { DatabaseUtil } from '../../database/databse.util.js';
import { TypeGenerator } from '../../generator/generator.builder.js';

export default class DatabaseTypePull extends Command {
    static description = 'Generates types based of asset types defined in sigauth instance';
    //  generate types based of direct data source access bypassing sigauth api

    static flags = {
        out: Flags.string({
            char: 'o',
            description: 'Path to out typescript files',
            required: false,
            default: './src/sigauth',
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(DatabaseTypePull);

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            throw new Error('DATABASE_URL not set in env');
        }

        const spinner = ora('Connecting to database…').start();
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
        }

        // get asset types
        spinner.start('Fetching asset types…');
        const types = await dbGateway.getAssetTypes();
        spinner.succeed(`Fetched ${types.length} asset types`);
        spinner.start('Generating types...');

        new TypeGenerator(types, flags.out).generate();
        spinner.succeed('Type generation completed: asset-types.ts');
        this.exit(0);
    }
}
