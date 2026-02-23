import { SigAuthNextWrapper } from '@/lib/pre-sigauth/generated/next/sigauth.nextjs';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    // we pass the options again because this action could be called independently from the layout
    return await SigAuthNextWrapper.codeExchange(req.url);
}

