import type { AccountWithPermissions } from '@sigauth/prisma-wrapper/prisma-extended';
import type { App, Asset, AssetType, Container, Session } from '@sigauth/prisma-wrapper/prisma-types';
import { createContext, use, useState, type ReactNode } from 'react';

export type SessionStorage = {
    account?: AccountWithPermissions;
    session?: Session;
    accounts: AccountWithPermissions[];
    assetTypes: AssetType[];
    assets: Asset[];
    apps: App[];
    containers: Container[];
};

export type SessionContext = {
    session: SessionStorage;
    setSession: (update: Partial<SessionStorage>) => void;
};

const defaultSessionContext: SessionStorage = {
    account: undefined,
    session: undefined,
    accounts: [],
    assetTypes: [],
    assets: [],
    apps: [],
    containers: [],
};

export const SessionStorageContext = createContext<SessionContext | null>(null);

// Context Provider
export default function SessionContextProvider({ children, init }: { init: SessionStorage | null; children: ReactNode }) {
    const [sessionStorage, setSessionState] = useState<SessionStorage>(init || defaultSessionContext);

    const setSession = (update: Partial<SessionStorage>) => {
        setSessionState(prev => ({ ...prev, ...update }));
    };

    return <SessionStorageContext.Provider value={{ session: sessionStorage, setSession }}>{children}</SessionStorageContext.Provider>;
}

export function useSession() {
    const ctx = use(SessionStorageContext);
    if (!ctx) throw new Error('useSession must be used within a SessionContextProvider');
    return ctx;
}
