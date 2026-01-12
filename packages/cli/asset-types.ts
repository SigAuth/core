interface Account {
    deactivated: boolean;
    uuid: string;
    email: string;
    twoFactorCode?: string;
    passwordHash: string;
    api?: string;
    username: string;
}

interface Session {
    uuid: string;
    subject: Account;
    expire: number;
    created: number;
}

interface Mirror {
    autoRun: boolean;
    uuid: string;
    autoRunInterval?: number;
    lastRun?: Date;
    name: string;
    code: string;
    lastResult?: string;
}

interface App {
    uuid: string;
    name: string;
    url: string;
    oidcAuthCodeCb?: string;
    token?: string;
    scopes?: string;
}

interface AuthorizationInstance {
    uuid: string;
    session: Session;
    app: App;
    refreshToken: string;
    accessToken: string;
}

interface AuthorizationChallenge {
    session: Session;
    app: App;
    created: Date;
    uuid: string;
    authCode: string;
    challenge: string;
    redirectUri: string;
}
