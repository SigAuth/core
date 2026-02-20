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

            const secureCookies = (
                await enquirer.prompt<{ enabled: boolean }>({
                    type: 'toggle',
                    name: 'enabled',
                    message: 'Secure Cookies?',
                    enabled: 'Yes',
                    disabled: 'No',
                })
            ).enabled;

            const audience = (
                await enquirer.prompt<{ audience: string }>({
                    type: 'input',
                    name: 'audience',
                    message: 'Audience of your SigAuth application:',
                })
            ).audience;

            const config = new Config();

            this.log(chalk.green(`✔ Issuer received: ${issuer}`));
            this.log(chalk.green(`✔ Secure Cookies: ${secureCookies}`));
            this.log(chalk.green(`✔ Audience received: ${audience}`));

            config.setup(issuer, secureCookies, audience);
        } catch (error) {
            // If the user aborts the prompt with Ctrl+C
            this.log(chalk.yellow('\nSetup aborted.'));
        }
    }
}

