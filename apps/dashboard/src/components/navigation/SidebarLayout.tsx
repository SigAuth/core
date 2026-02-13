import { AppSidebar, sidebarItems, type SidebarItem } from '@/components/navigation/AppSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router';

export default function Layout() {
    const pages = useMemo(() => {
        function findPath(items: SidebarItem[], targetUrl: string): SidebarItem[] | null {
            for (const item of items) {
                if (item.url === targetUrl) {
                    return [item];
                }

                if (item.children) {
                    const childPath = findPath(item.children, targetUrl);
                    if (childPath) {
                        return [item, ...childPath];
                    }
                }
            }
            return null;
        }

        return findPath(sidebarItems, window.location.pathname);
    }, [useNavigate()]);

    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="p-3 w-full">
                <div className="flex items-center gap-2">
                    <SidebarTrigger />
                    <Breadcrumb>
                        <BreadcrumbList>
                            {pages?.map((page, i) => (
                                <div key={page.title} className="w-fit flex items-center gap-2">
                                    <BreadcrumbItem key={page.title}>
                                        <BreadcrumbLink href={!page.children ? page.url : undefined}>{page.title}</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    {i < pages.length - 1 && <BreadcrumbSeparator />}
                                </div>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
                {/*  Childs of the route */}
                <Outlet />
            </main>
        </SidebarProvider>
    );
}
