import { SigAuthNextWrapper } from '@/lib/pre-sigauth/generated/next/sigauth.nextjs';

export default SigAuthNextWrapper.sigauthMiddeware;

export const config = {
    matcher: [
        // Exclude API routes, static files, image optimizations, and .png files
        '/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$).*)',
    ],
};

