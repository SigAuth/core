export interface Account {
    deactivated: boolean;
    uuid: string;
    email: string;
    twoFactorCode?: string;
    passwordHash: string;
    api?: string;
    username: string;

    subject_sessions: Session[];
}

export interface Session {
    uuid: string;
    subjectUuid: string;
    expire: number;
    created: number;

    subject_account: Account; // if field doesnt have name of module in it append it
}

export interface Mirror {
    autoRun: boolean;
    uuid: string;
    autoRunInterval?: number;
    lastRun?: Date;
    name: string;
    code: string;
    lastResult?: string;
}

export interface App {
    uuid: string;
    name: string;
    url: string;
    oidcAuthCodeCb?: string;
    token?: string;
    scopes?: string;

    authorizationInstances?: AuthorizationInstance[];
    authorizationChallenges?: AuthorizationChallenge[];
}

export interface AuthorizationInstance {
    uuid: string;
    sessionUuid: string;
    appUuid: string;
    refreshToken: string;
    accessToken: string;

    session?: Session; // if field already has name of module in it just leave it
    app?: App;
}

export interface AuthorizationChallenge {
    sessionUuid: string;
    appUuid: string;
    created: Date;
    uuid: string;
    authCode: string;
    challenge: string;
    redirectUri: string;

    app?: App;
    session?: Session;
}

