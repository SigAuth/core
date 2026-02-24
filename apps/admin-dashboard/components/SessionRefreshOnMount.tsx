'use client';

import { useEffect } from 'react';

export function SessionRefreshOnMount({
    onFailureRedirect,
    reloadOnSuccess = false,
    loadingElement = <></>,
}: {
    onFailureRedirect?: string;
    reloadOnSuccess?: boolean;
    loadingElement?: React.ReactNode;
}) {
    useEffect(() => {
        void (async () => {
            try {
                const res = await fetch('/api/oidc/refresh', {
                    method: 'POST',
                    credentials: 'include',
                });

                if (res.ok && res.status === 200) {
                    // 204 is successfull but not refreshed
                    if (reloadOnSuccess) {
                        window.location.reload();
                    }
                }

                if (!res.ok && onFailureRedirect) {
                    window.location.href = onFailureRedirect;
                }
            } catch (error) {
                if (onFailureRedirect) {
                    window.location.href = onFailureRedirect;
                }
            }
        })();
    }, [onFailureRedirect, reloadOnSuccess]);

    return (
        <html lang="en" suppressHydrationWarning>
            <body style={{ height: '100vh', width: '100vw' }}>{loadingElement}</body>
        </html>
    );
}

