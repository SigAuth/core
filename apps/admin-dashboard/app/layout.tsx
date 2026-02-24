'use server';

import { AppSidebar, sidebarItems } from '@/components/navigation/AppSidebar';
import { DynamicBreadcrumbs } from '@/components/navigation/DynamicBreadcrumbs';
import { SessionRefreshOnMount } from '@/components/SessionRefreshOnMount';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import ensureAuthentication from '@/lib/pre-sigauth/generated/next/sigauth.action';
import { ReactNode } from 'react';
import './globals.css';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const authResult = await ensureAuthentication('/');

    if (authResult.refreshRequired) {
        return (
            <SessionRefreshOnMount
                reloadOnSuccess
                onFailureRedirect={authResult.loginRedirect ?? '/'}
                loadingElement={<div className="w-full h-full bg-gray-800" />}
            />
        );
    }

    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <ThemeProvider>
                    <SidebarProvider>
                        <AppSidebar />
                        <main className="p-3 w-full">
                            <div className="flex items-center gap-2">
                                <SidebarTrigger />
                                {/* Die Breadcrumbs müssen Client-seitig sein, da sie die URL brauchen */}
                                <DynamicBreadcrumbs items={sidebarItems} />
                            </div>
                            {children}
                        </main>
                    </SidebarProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}

