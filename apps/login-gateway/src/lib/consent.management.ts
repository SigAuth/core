export const ConsentManager = {
    obtainPersistentConsent: (clientId: string, accountId: string) => {
        const key = `consent_${clientId}_${accountId}`;
        const stored = localStorage.getItem(key);
        if (!stored) return [];
        try {
            return JSON.parse(stored) as string[];
        } catch {
            localStorage.removeItem(key);
            return [];
        }
    },

    requiresConsentForScopes: (clientId: string, accountId: string, requestedScopes: string[]) => {
        const consentedScopes = ConsentManager.obtainPersistentConsent(clientId, accountId);
        return !requestedScopes.every(scope => consentedScopes.includes(scope));
    },

    persistConsent: (clientId: string, accountId: string, scopes: string[]) => {
        const key = `consent_${clientId}_${accountId}`;
        localStorage.setItem(key, JSON.stringify(scopes));
    },
};
