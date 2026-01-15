import { Command } from '@oclif/core';
import { SigauthClient } from '../../sigauth/sigauth.client.js';

export default class ClientTest extends Command {
    async run(): Promise<void> {
        await new SigauthClient().mirror.update({
            where: {
                autoRun: true,
            },
            data: {
                name: 'Updated via CLI',
            },
        });
    }

    // Problem: join tables tauchen aktuell gar nicht auf
}
