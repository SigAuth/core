import { Injectable, Logger } from '@nestjs/common';
import { FundamentalAssetTypeMapping, ProtectedData } from '@sigauth/sdk/protected';
import { convertTypeTableToUuid } from '@sigauth/sdk/utils';
import { createPrivateKey, createPublicKey, generateKeyPairSync, KeyObject } from 'crypto';
import fs from 'fs';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly PATH = './config';

    private fundamentalAssetTypeMapping: FundamentalAssetTypeMapping | null = null;

    private authPublicKey: KeyObject | null = null;
    private authPrivateKey: KeyObject | null = null;

    // instance specific fields
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

    public saveConfigFile(props: { mapping?: FundamentalAssetTypeMapping; sigauthAppUuid?: string }) {
        const path = `${this.getPath()}/sigauth-config.json`;
        const config = {
            mapping: props.mapping || this.fundamentalAssetTypeMapping,
            sigauthAppUuid: props.sigauthAppUuid || this.sigauthAppUuid,
        };

        fs.writeFileSync(path, JSON.stringify(config, null, 2));

        this.fundamentalAssetTypeMapping = props.mapping || this.fundamentalAssetTypeMapping;
        this.sigauthAppUuid = props.sigauthAppUuid || this.sigauthAppUuid;
    }

    private loadConfigFile() {
        const path = `${this.getPath()}/sigauth-config.json`;

        if (fs.existsSync(path)) {
            this.logger.log('Loading instance signature from config.');
            const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
            this.fundamentalAssetTypeMapping = data.mapping as FundamentalAssetTypeMapping;
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
        if (!this.fundamentalAssetTypeMapping || !this.sigauthAppUuid) throw new Error('Storage service not initialized yet');

        const criticalUuids = structuredClone(this.fundamentalAssetTypeMapping);

        Object.keys(criticalUuids).forEach(key => {
            const k = key as keyof typeof criticalUuids;
            criticalUuids[k] = convertTypeTableToUuid(criticalUuids[k]);
        });

        return {
            mapping: criticalUuids,
            sigauthAppUuid: this.sigauthAppUuid!,
        };
    }

    get FundamentalAssetTypeMapping(): FundamentalAssetTypeMapping | null {
        return this.fundamentalAssetTypeMapping;
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

