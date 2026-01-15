import { Command } from '@oclif/core';
import { SigauthClient } from '../../sigauth/sigauth.client.js';

export default class ClientTest extends Command {
    async run(): Promise<void> {
        const client = new SigauthClient();
        await client.mirror.updateAuthorization({
            where: {
                name: 'Test Mirror',
            },
            authorization: {
                userUuid: '00000000-0000-0000-0000-000000000001',
                scopes: ['sigauth:mirrors:write', 'sigauth:assets:write'],
                appUuid: '00000000-0000-0000-0000-000000000002',
            },
        });
    }
    // Problem: join tables tauchen aktuell gar nicht auf
}
