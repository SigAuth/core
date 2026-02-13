import { Command } from '@oclif/core';
import chalk from 'chalk';
import enquirer from 'enquirer';
import { Config } from '../config/config.js';

export default class SetupCommand extends Command {
    static description = 'Setup the Sigauth CLI by creating a configuration file with the necessary credentials.';

    async run(): Promise<void> {
        this.log(chalk.blue.bold('--- Sigauth CLI Setup ---'));

        try {
            const issuer = (
                await enquirer.prompt<{ issuer: string }>({
                    type: 'input',
                    name: 'issuer',
                    message: 'Adress to your SigAuth instance:',
                })
            ).issuer;
            if (!issuer) this.error(chalk.red('Error: Issuer is required. Please provide the address to your SigAuth instance.'));

            const appId = (
                await enquirer.prompt<{ appId: string }>({
                    type: 'password',
                    name: 'appId',
                    message: 'App ID of your SigAuth application:',
                })
            ).appId;

            const appToken = (
                await enquirer.prompt<{ appToken: string }>({
                    type: 'password',
                    name: 'appToken',
                    message: 'App Token of your SigAuth application:',
                })
            ).appToken;

            this.log(chalk.green(`✔ Issuer received: ${issuer}`));
            this.log(chalk.green(`✔ App ID received: ${appId.substring(0, 4)}****`));
            this.log(chalk.green(`✔ App Token received: ${appToken.substring(0, 4)}****`));

            const config = new Config();
            config.setup(issuer, appId, appToken);
        } catch (error) {
            // If the user aborts the prompt with Ctrl+C
            this.log(chalk.yellow('\nSetup aborted.'));
        }
    }
}

