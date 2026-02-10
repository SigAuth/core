import { JSONSerializable } from 'src/asset-type.architecture.js';
import { Config } from '../cli/config/config.js';

export type SigAuthRequestOptions = {
    body?: JSONSerializable;
    config: Config;
    internalAuthorization?: boolean; // whether to include internal auth header for CLI requests
};

export async function sigauthRequest(
    method: 'POST' | 'GET',
    url: string,
    { body, config, internalAuthorization = true }: SigAuthRequestOptions,
): Promise<Response> {
    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-sigauth-app-id': config.get('appId')!,
                'x-sigauth-app-token': config.get('appToken')!,
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

