import { Command } from '@oclif/core';
import { SigauthClient } from '../../sigauth-implement-update/sigauth.client.js';

export default class ClientTest extends Command {
    async run(): Promise<void> {
        await new SigauthClient().mirror.createMany({
            data: [
                {
                    autoRun: false,
                    code: "console.log('Hello World');",
                    name: 'Test Mirror 1',
                    ownerUuids: ['019bc20a-d313-78ad-a52b-33ba2c7ecd05'],
                },
                {
                    autoRun: false,
                    code: "console.log('Hello World');",
                    name: 'Test Mirror 2',
                    ownerUuids: ['019bc20a-d313-78ad-a52b-33ba2c7ecd05'],
                },
            ],
        });
    }

    // Problem: join tables tauchen aktuell gar nicht auf
}
