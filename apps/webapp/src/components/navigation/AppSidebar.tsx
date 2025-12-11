import {
    AppWindow,
    ChevronDown,
    Container,
    FlipHorizontal,
    Home,
    Layers,
    NotepadText,
    Settings,
    Stamp,
    TriangleAlertIcon,
    Users,
} from 'lucide-react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { logout } from '@/lib/utils';
import { useNavigate } from 'react-router';

export type SidebarItem = {
    title: string;
    url: string;
    icon: React.ElementType;
    disabled?: boolean;
    children?: SidebarItem[];
};

// Menu items.
export const sidebarItems: SidebarItem[] = [
    {
        title: 'Home',
        url: '/',
        icon: Home,
    },
    {
        title: 'Accounts',
        url: '/accounts',
        icon: Users,
    },
    {
        title: 'Assets',
        url: '/asset',
        icon: NotepadText,
        children: [
            { title: 'Types', url: '/asset/types', icon: Stamp },
            { title: 'Instances', url: '/asset/instances', icon: Layers },
        ],
    },
    {
        title: 'Apps',
        url: '/apps',
        icon: AppWindow,
    },
    {
        title: 'Container',
        url: '/container',
        icon: Container,
    },
    {
        title: 'Mirror',
        url: '/mirror',
        icon: FlipHorizontal,
    },
    {
        title: 'Settings',
        url: '/settings',
        icon: Settings,
    },
];

export function AppSidebar() {
    const navigate = useNavigate();

    // TODO this is shoud create children recursively currently it can only handle one level of children
    return (
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>SigAuth</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {sidebarItems.map(item => {
                                if (item.children) {
                                    return (
                                        <Collapsible key={item.title} className="group/collapsible">
                                            <CollapsibleTrigger className="w-full">
                                                <SidebarMenuButton asChild className="w-full">
                                                    <div className="flex items-center">
                                                        <item.icon />
                                                        <span>{item.title}</span>
                                                        <ChevronDown className="ml-auto" />
                                                    </div>
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>

                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    {item.children.map(subItem => (
                                                        <SidebarMenuSubItem
                                                            key={subItem.title}
                                                            className={`${subItem.disabled ? 'cursor-not-allowed' : 'cursor-default'} ${window.location.pathname === subItem.url ? 'bg-accent' : ''}`}
                                                        >
                                                            <SidebarMenuSubButton asChild>
                                                                <div onClick={() => !subItem.disabled && navigate(subItem.url)}>
                                                                    <subItem.icon />
                                                                    <span>{subItem.title}</span>
                                                                </div>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    ))}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    );
                                } else {
                                    return (
                                        <SidebarMenuItem
                                            key={item.title}
                                            className={`${item.disabled ? 'cursor-not-allowed' : 'cursor-default'} ${window.location.pathname === item.url ? 'bg-accent' : ''}`}
                                        >
                                            <SidebarMenuButton asChild>
                                                <div onClick={() => !item.disabled && navigate(item.url)}>
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                </div>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                }
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <div className="flex items-center justify-center gap-2 m-2 mx-5">
                    <ThemeToggle />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button className="w-full">Logout</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader className="items-center">
                                <div className="bg-destructive/10 mx-auto mb-2 flex size-12 items-center justify-center rounded-full">
                                    <TriangleAlertIcon className="text-destructive size-6" />
                                </div>
                                <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                                <AlertDialogDescription className="text-center">
                                    This will log you out of your current session and all apps you are currently authenticated with.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction asChild>
                                    <Button
                                        className="bg-destructive dark:bg-destructive/60 hover:bg-destructive focus-visible:ring-destructive text-white"
                                        onClick={logout}
                                    >
                                        Log Out
                                    </Button>
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
