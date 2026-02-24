import dotenv from 'dotenv';

export type SigAuthConfig = {
    /** URL to SigAuth Instance */
    issuer: string;
    /** Path were SigAuth code will be generated to */
    out?: string;
    refreshEndpoint: string; // endpoint to call to refresh tokens
    /** Threshold how much time should be left before refresh is attempted */
    refreshThresholdSeconds?: number;
    /** Wether to use Secure cookies or not */
    secureCookies?: boolean;
    /** Client ID provided by SigAuth Instance  */
    appId: string;
    /** Client Token provided by SigAuth Instance  */
    appToken: string;
    /** Redirect URI to expect OIDC Callack from */
    redirectUri: string;
};

export const loadEnviroment = (path: string = '.env') => {
    dotenv.config({ path, quiet: true });
};

export const env = (key: string) => {
    const value = process.env[key];
    if (!value) throw new Error(`Environment variable ${key} is not set`);
    return value;
};

