import { SigAuthNextWrapper } from '@/lib/pre-sigauth/generated/next/sigauth.nextjs';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
    return await SigAuthNextWrapper.login(req.url);
}

