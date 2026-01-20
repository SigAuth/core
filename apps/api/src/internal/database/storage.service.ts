import { TableIdSignature } from '@/internal/client/sigauth.client';
import { Injectable, Logger } from '@nestjs/common';
import { createPrivateKey, createPublicKey, generateKeyPairSync, KeyObject } from 'crypto';
import fs from 'fs';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);
    private readonly PATH = './config';

    private instancedSignature: TableIdSignature | null = null;

    private authPublicKey: KeyObject | null = null;
    private authPrivateKey: KeyObject | null = null;

    getPath(): string {
        return this.PATH;
    }

    async onModuleInit() {
        const path = this.getPath();
        this.logger.log(`Configuration path set to: ${path}`);

        fs.mkdirSync(path, { recursive: true });
        this.loadAuthKeyPair();
        this.loadInstancedSignature();
    }

    public saveInstancedSignature(signature: TableIdSignature) {
        const path = `${this.getPath()}/instance_signature.json`;
        fs.writeFileSync(path, JSON.stringify(signature, null, 2));
        this.instancedSignature = signature;
    }

    private loadInstancedSignature() {
        const path = `${this.getPath()}/instance_signature.json`;

        if (fs.existsSync(path)) {
            this.logger.log('Loading instance signature from config.');
            const data = fs.readFileSync(path, 'utf-8');
            this.instancedSignature = JSON.parse(data) as TableIdSignature;
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

    get InstancedSignature(): TableIdSignature | null {
        return this.instancedSignature;
    }

    get AuthPrivateKey(): KeyObject | null {
        return this.authPrivateKey;
    }

    get AuthPublicKey(): KeyObject | null {
        return this.authPublicKey;
    }
}
