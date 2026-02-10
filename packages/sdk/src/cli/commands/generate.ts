import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import { DefinitiveAssetType } from '../../asset-type.architecture.js';
import { Config } from '../config/config.js';
import { SDKGenerator } from '../generator/generator.builder.js';
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
        if (!config.All) {
            this.error(
                chalk.red(`Failed to load configuration. Please ensure your config file is correct and located at ${config['configPath']}`),
            );
        }

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

            const typeRes = await sigauthRequest('GET', `/api/asset-type/all`, {
                config: config.All,
                internalAuthorization: false,
            });

            if (!typeRes.ok || !config.get('out')) {
                spinner.fail(chalk.red('Failed to fetch asset types or output path not defined.'));
                if (!typeRes.ok) this.error(chalk.red(`API Error: ${typeRes.status} ${typeRes.statusText}`));
                if (!config.get('out'))
                    this.error(
                        chalk.red(
                            'Error: Output path not defined in config. Please set the "out" property in your sigauth.config.ts file.',
                        ),
                    );
            }

            const types: DefinitiveAssetType[] = await typeRes.json();
            const generator = new SDKGenerator(types, config.get('out')!);
            generator.generate();

            spinner.succeed(chalk.green('Types successfully generated!'));
        } catch (error) {
            spinner.fail(chalk.red('Generation failed.'));
            this.error(error as Error);
        }
    }
}

