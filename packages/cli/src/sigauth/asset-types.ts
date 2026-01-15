export interface Account {
    deactivated: boolean;
    uuid: string;
    email: string;
    twoFactorCode?: string;
    passwordHash: string;
    api?: string;
    username: string;
    /** Reverse relation from Session.subjectUuid */
    subject_sessions?: Session[];
    /** Reverse relation from Mirror.ownerUuids */
    ownerUuids_mirrors?: Mirror[];
}

export interface Session {
    uuid: string;
    subjectUuid: string;
    expire: number;
    created: number;
    /** These fields are only available when the relation is included in the query */
    subject_account?: Account;
    /** Reverse relation from AuthorizationInstance.sessionUuid */
    session_authorizationinstances?: AuthorizationInstance[];
    /** Reverse relation from AuthorizationChallenge.sessionUuid */
    session_authorizationchallenges?: AuthorizationChallenge[];
}

export interface App {
    uuid: string;
    name: string;
    url: string;
    oidcAuthCodeCb?: string;
    token?: string;
    scopes?: string[];
    /** Reverse relation from AuthorizationInstance.appUuid */
    app_authorizationinstances?: AuthorizationInstance[];
    /** Reverse relation from AuthorizationChallenge.appUuid */
    app_authorizationchallenges?: AuthorizationChallenge[];
}

export interface Mirror {
    autoRun: boolean;
    uuid: string;
    autoRunInterval?: number;
    lastRun?: Date;
    name: string;
    code: string;
    lastResult?: string;
    ownerUuids?: string[];
    /** These fields are only available when the relation is included in the query */
    owner_accounts?: Account[];
}

export interface AuthorizationInstance {
    uuid: string;
    sessionUuid: string;
    appUuid: string;
    refreshToken: string;
    accessToken: string;
    /** These fields are only available when the relation is included in the query */
    session_reference?: Session;
    app_reference?: App;
}

export interface AuthorizationChallenge {
    sessionUuid: string;
    appUuid: string;
    created: Date;
    uuid: string;
    authCode: string;
    challenge: string;
    redirectUri: string;
    /** These fields are only available when the relation is included in the query */
    session_reference?: Session;
    app_reference?: App;
}
