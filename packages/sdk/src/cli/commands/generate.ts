import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import { AssetType } from '../../asset.types.js';
import { Config } from '../config/config.js';
import { sigauthRequest } from '../utils.js';

export default class GenerateTypes extends Command {
    static description = 'Generates types based of asset types defined in sigauth instance';

    static flags = {
        verbose: Flags.boolean({
            char: 'v',
            description: 'Verbose logging for debugging purposes',
            default: false,
        }),
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(GenerateTypes);

        const msg = (message: string): void => {
            if (flags.verbose) {
                this.log(chalk.gray(`[DEBUG] ${message}`));
            }
        };

        this.log(chalk.blue('Starting Type Generation...'));

        const config = new Config();
        await config.loadConfig();

        if (flags.verbose) {
            msg(`Loading environment variables from: ${process.cwd()}/sigauth.config.ts`);
            msg(`Issuer: ${config.get('issuer')}`);
            msg(`App ID: ${config.get('appId') ? '****' : 'Not set'}`);
            msg(`App Token: ${config.get('appToken') ? '****' : 'Not set'}`);
        }

        if (!config.get('issuer') || !config.get('appId') || !config.get('appToken')) {
            this.error(
                chalk.red(
                    'Error: Missing required environment variables. Please ensure SIGAUTH_API_URL, SIGAUTH_API_CLIENTID, and SIGAUTH_API_KEY are set in your .env file.',
                ),
            );
        }

        const spinner = ora('Contacting Sigauth Core...').start();

        try {
            if (flags.verbose) {
                spinner.stop();
                msg('Establishing connection to Sigauth API...');
                spinner.start();
            }

            const typeRes = await sigauthRequest('GET', `${config.get('issuer')}/api/asset-type/all`, {
                config,
                internalAuthorization: false,
            });
            this.log(chalk.blue('Received response from Sigauth API. Processing asset types...'));

            const types: AssetType[] = await typeRes.json();
            console.log('Response Body:', types);

            spinner.succeed(chalk.green('Types successfully generated!'));
        } catch (error) {
            spinner.fail(chalk.red('Generation failed.'));
            this.error(error as Error);
        }
    }
}

