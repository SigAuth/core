'use server';

import { SigAuthSDK } from '@/lib/sigauth/generated/sigauth.client';
import { config } from '@/sigauth.config';
import { ReactNode } from 'react';
import './globals.css';

async function setupLookUp() {
    const sdk = new SigAuthSDK(config);

    const res = await sdk.Account.find({ where: { username: 'admin' }, internalAuthorization: false });
    console.log('Accounts:', res);
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const setup = await setupLookUp();

    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}

