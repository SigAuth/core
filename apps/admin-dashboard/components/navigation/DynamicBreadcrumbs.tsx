'use client';

import type { SidebarItem } from '@/components/navigation/AppSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';

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

export function DynamicBreadcrumbs({ items }: { items: SidebarItem[] }) {
    const pathname = usePathname();
    const activePages = (pathname && findPath(items, pathname)) || [];

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {activePages.map((page, i) => (
                    <div key={page.title} className="w-fit flex items-center gap-2">
                        <BreadcrumbItem>
                            <BreadcrumbLink href={!page.children ? page.url : undefined}>{page.title}</BreadcrumbLink>
                        </BreadcrumbItem>
                        {i < activePages.length - 1 && <BreadcrumbSeparator />}
                    </div>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

