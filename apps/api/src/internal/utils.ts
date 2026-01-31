import { randomBytes } from 'crypto';

export const Utils = {
    convertPermissionNameToIdent: (name: string) => name.toLowerCase().replace(/ /g, '-'),

    /**
     * Converts the given signature (table names like 'asset_<uuidv7>') to just the UUID
     * @param signature
     */
    convertSignatureToUuid: (signature: string) => {
        if (!signature.startsWith('asset_')) {
            throw new Error('Invalid signature format');
        }
        const uuid = signature.slice(6, signature.length);
        return uuid.replaceAll(/_/g, '-');
    },

    generateToken: (length: number) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        const generatedToken = Array.from(array, x => characters[x % characters.length]).join('');
        return generatedToken;
    },
    uuidv7: (): string => {
        const bytes = Buffer.alloc(16);

        const now = Date.now();
        bytes.writeUIntBE(now, 0, 6);
        randomBytes(10).copy(bytes, 6);

        bytes[6] = (bytes[6] & 0x0f) | 0x70;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const hex = bytes.toString('hex');
        return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20)].join('-');
    },
};

