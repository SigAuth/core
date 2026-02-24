'use server';

import { SigAuthNextWrapper } from '@/lib/pre-sigauth/generated/next/sigauth.nextjs';

export default async function ensureAuthentication(state: string) {
    // we pass the options again because this action could be called independently from the layout
    return await SigAuthNextWrapper.checkAuthentication(state, { refreshSessionCookies: false });
}

