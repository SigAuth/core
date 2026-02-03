import type { Asset, AssetType } from '@sigauth/generics/asset';
import type { Account, App, Session } from '@sigauth/generics/database/orm-client/types.client';
import type { ProtectedData } from '@sigauth/generics/protected';
import { createContext, use, useState, type ReactNode } from 'react';

export type SessionStorage = {
    account?: Account;
    session?: Session;
    accounts: Account[];
    assetTypes: AssetType[];
    assets: ({ typeUuid: string } & Asset)[];
    apps: App[];
    protected?: ProtectedData;
};

export type SessionContext = {
    session: SessionStorage;
    setSession: (update: Partial<SessionStorage>) => void;
};

const defaultSessionContext: SessionStorage = {
    account: undefined,
    session: undefined,
    protected: undefined,
    accounts: [],
    assetTypes: [],
    assets: [],
    apps: [],
};

export const SessionStorageContext = createContext<SessionContext | null>(null);

// Context Provider
export default function SessionContextProvider({ children, init }: { init: SessionStorage | null; children: ReactNode }) {
    const [sessionStorage, setSessionState] = useState<SessionStorage>({ ...defaultSessionContext, ...init });

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

