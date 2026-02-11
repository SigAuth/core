import { Injectable, Logger } from '@nestjs/common';
import { ProtectedData } from '@sigauth/sdk/protected';
import { createPrivateKey, createPublicKey, generateKeyPairSync, KeyObject } from 'crypto';
import fs from 'fs';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly PATH = './config';

    private authPublicKey: KeyObject | null = null;
    private authPrivateKey: KeyObject | null = null;

    // instance specific fields
    // TODO saving the app uuid in the config is actually deprecated and can just be pulled from the db on startup
    private sigauthAppUuid: string | null = null;

    getPath(): string {
        return this.PATH;
    }

    async onModuleInit() {
        const path = this.getPath();
        this.logger.log(`Configuration path set to: ${path}`);

        fs.mkdirSync(path, { recursive: true });
        this.loadAuthKeyPair();
        this.loadConfigFile();
    }

    public saveConfigFile(props: { sigauthAppUuid?: string }) {
        const path = `${this.getPath()}/sigauth-config.json`;
        const config = {
            sigauthAppUuid: props.sigauthAppUuid || this.sigauthAppUuid,
        };

        fs.writeFileSync(path, JSON.stringify(config, null, 2));

        this.sigauthAppUuid = props.sigauthAppUuid || this.sigauthAppUuid;
    }

    private loadConfigFile() {
        const path = `${this.getPath()}/sigauth-config.json`;

        if (fs.existsSync(path)) {
            this.logger.log('Loading instance signature from config.');
            const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
            this.sigauthAppUuid = data.sigauthAppUuid;
        }
    }

    private loadAuthKeyPair() {
        const privatePath = `${this.getPath()}/auth_private_key.pem`;
        const publicPath = `${this.getPath()}/auth_public_key.pem`;

        if (fs.existsSync(privatePath) && fs.existsSync(publicPath)) {
            this.logger.log('Loading authentication key pair from config.');
            this.authPrivateKey = createPrivateKey(fs.readFileSync(privatePath, 'utf-8'));
            this.authPublicKey = createPublicKey(fs.readFileSync(publicPath, 'utf-8'));
        } else {
            this.logger.log('Generating new authentication key pair, because none were found in config.');
            const pair = generateKeyPairSync('rsa', {
                modulusLength: 4096,
                publicExponent: 0x10001,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            });

            fs.writeFileSync(`${this.getPath()}/auth_public_key.pem`, pair.publicKey);
            fs.writeFileSync(`${this.getPath()}/auth_private_key.pem`, pair.privateKey);
        }
    }

    public getProtectedData(): ProtectedData {
        if (!this.sigauthAppUuid) throw new Error('Storage service not initialized yet');

        return {
            sigauthAppUuid: this.sigauthAppUuid!,
        };
    }

    get AuthPrivateKey(): KeyObject | null {
        return this.authPrivateKey;
    }

    get AuthPublicKey(): KeyObject | null {
        return this.authPublicKey;
    }

    get SigAuthAppUuid(): string | null {
        return this.sigauthAppUuid;
    }
}

