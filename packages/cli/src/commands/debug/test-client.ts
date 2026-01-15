import { Command } from '@oclif/core';
import { SigauthClient } from '../../sigauth-gen-example/sigauth.client.js';

export default class ClientTest extends Command {
    async run(): Promise<void> {
        const result = await new SigauthClient().account.findOne({
            authorization: {
                userId: 'user-123',
                scopes: ['read:account'],
                recursive: true,
            },
            where: {
                username: 'test',
                deactivated: true,
                passwordHash: 'dfghaslrfigdsfuzagerfzgliufg',
            },
            includes: {
                subject_sessions: {
                    subject_account: true,
                },
            },
        });

        console.log(result?.subject_sessions[0].subject_account);
    }

    // Einfacher Join: Table wird ist über ein Feld mit anderem Verbunden
    // Komplexer Join: Join Table referenziert beide Tabellen

    // Für beide muss dynamischer Typ generiert werden
    // Probleme:
    // - Wie bennen wir die gejointen Felder (aktuell nur fremndschlüssel benannt fieldName_moduleName) field name wird so was wie id, uuid, identifier, noch weg geschnitten
    //   aus sessionId wird dann session_account
}
