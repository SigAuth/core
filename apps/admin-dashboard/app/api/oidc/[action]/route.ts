import { SigAuthNextWrapper } from '@/lib/pre-sigauth/generated/next/sigauth.nextjs';
import { NextRequest } from 'next/server';

type OidcAction = 'login' | 'callback' | 'logout' | 'refresh';

export async function GET(req: NextRequest, context: { params: Promise<{ action: string }> }) {
    const { action } = await context.params;

    switch (action as OidcAction) {
        case 'login':
            return await SigAuthNextWrapper.login(req.url);
        case 'callback':
            return await SigAuthNextWrapper.codeExchange(req.url);
        case 'logout':
            await SigAuthNextWrapper.refreshSessionCookies();
            return await SigAuthNextWrapper.logout('http://localhost:5174/');
        default:
            return new Response('Not Found', { status: 404 });
    }
}

export async function POST(_req: NextRequest, context: { params: Promise<{ action: string }> }) {
    const { action } = await context.params;

    if (action !== 'refresh') {
        return new Response('Not Found', { status: 404 });
    }

    const result = await SigAuthNextWrapper.refreshSessionCookies();
    if (result.failed) {
        return new Response(null, { status: 401 });
    }

    if (result.refreshed) {
        return new Response(null, { status: 200 });
    }

    return new Response(null, { status: 204 });
}

