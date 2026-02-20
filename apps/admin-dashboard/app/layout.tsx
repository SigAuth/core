import { AppSidebar, sidebarItems } from '@/components/navigation/AppSidebar';
import { DynamicBreadcrumbs } from '@/components/navigation/DynamicBreadcrumbs';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ReactNode } from 'react';
import './globals.css';

// Hilfsfunktion bleibt auf dem Server verfügbar
async function setupLookUp() {
    // const sdk = new SigAuthSDK(config);
    // const res = await sdk.Account.find({ where: { username: 'admin' }, internalAuthorization: false });
    // return res;
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    // Daten holen direkt auf dem Server
    await setupLookUp();

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

