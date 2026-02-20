import { JSONSerializable } from '../asset-type.architecture.js';
import { SigAuthConfig } from '../cli/config/config.types.js';

export type SigAuthRequestOptions = {
    body?: JSONSerializable;
    config: SigAuthConfig;
    internalAuthorization?: boolean; // whether to include internal auth header for CLI requests
};

export async function sigauthRequest(
    method: 'POST' | 'GET',
    url: string,
    { body, config, internalAuthorization = true }: SigAuthRequestOptions,
): Promise<Response> {
    try {
        const res = await fetch(`${config.issuer}${url}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-sigauth-app-id': config.appId!,
                'x-sigauth-app-token': config.appToken!,
                ...(internalAuthorization ? { 'x-sigauth-internal-account-authorization': 'true' } : {}),
            },
            credentials: 'include', // ensure cookies are sent with request
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            console.log('Request failed status: ', res.status);
        }
        return res;
    } catch (error) {
        console.error(`\n[Network Error] Failed to connect to ${url}`);
        // Log the actual cause (e.g. ECONNREFUSED)
        console.error('Details:', error);
        throw error;
    }
}

export const convertTypeTableToUuid = (tableName: string) => {
    if (!tableName.startsWith('asset_')) {
        if (tableName.startsWith('_internal')) return tableName;

        throw new Error('Invalid signature format for asset type: ' + tableName);
    }
    const uuid = tableName.slice(6, tableName.length);
    return uuid.replaceAll(/_/g, '-');
};

