import { SigAuthNextWrapper } from '@/lib/pre-sigauth/generated/next/sigauth.nextjs';

export async function POST() {
    const result = await SigAuthNextWrapper.refreshSessionCookies();
    if (result.failed) {
        return new Response(null, { status: 401 });
    }

    if (result.refreshed) {
        return new Response(null, { status: 200 });
    }
    return new Response(null, { status: 204 });
}

