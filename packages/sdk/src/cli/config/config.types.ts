import dotenv from 'dotenv';

export type SigAuthConfig = {
    issuer: string;
    out: string;
    audience: string;
    refreshThresholdSeconds: number;
    secureCookies: boolean;
    appId: string;
    appToken: string;
};

export const loadEnviroment = (path: string = '.env') => {
    dotenv.config({ path, quiet: true });
};

export const env = (key: string) => {
    const value = process.env[key];
    if (!value) throw new Error(`Environment variable ${key} is not set`);
    return value;
};

