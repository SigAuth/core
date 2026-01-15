import { Command } from '@oclif/core';
import { SigauthClient } from '../../sigauth/sigauth.client.js';

export default class ClientTest extends Command {
    async run(): Promise<void> {
        const result = await new SigauthClient().mirror.findOne({
            includes: {
                owner_accounts: true,
            },
        });
    }

    // Problem: join tables tauchen aktuell gar nicht auf
}
