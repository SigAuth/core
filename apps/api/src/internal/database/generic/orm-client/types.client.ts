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
    /** Reverse relation from Grant.accountUuid */
    account_grants?: Grant[];
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

    /** Reverse relation from AuthorizationInstance.appUuid */
    app_authorizationinstances?: AuthorizationInstance[];
    /** Reverse relation from AuthorizationChallenge.appUuid */
    app_authorizationchallenges?: AuthorizationChallenge[];
    /** Reverse relation from AppAccess.appUuid */
    app_accesses?: AppAccess[];
    /** Reverse relation from Grant.appUuid */
    app_grants?: Grant[];
    /** Reverse relation from Permission.appUuid */
    app_permissions?: Permission[];
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

export interface AuthorizationInstance {
    uuid: string;
    sessionUuid: string;
    appUuid: string;
    refreshTokenExpire: number;
    refreshToken: string;
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

// Ungenerated internal types go here
export type AssetType = {
    uuid: string;
    name: string;
    externalJoinKeys: string[];

    /** Reverse relation from Permission.typeUuid */
    type_permissions?: Permission[];
    /** Reverse relation from AppAccess.typeUuid */
    type_appAccesses?: AppAccess[];
    /** Reverse relation from Grant.typeUuid */
    type_grants?: Grant[];
};

export interface Grant {
    accountUuid: string;
    assetUuid?: string;
    typeUuid?: string;
    appUuid: string;
    permission: string;
    grantable: boolean;

    /** These fields are only available when the relation is included in the query */
    account_reference?: Account;
    app_reference?: App;
    type_reference?: AssetType;
}

// TODO we could think about merging AppAccess to Permissions -> Therore a functionality would be needed that grants could be applied to apps or not all all
export interface AppAccess {
    appUuid: string;
    typeUuid: string;
    find: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;

    /** These fields are only available when the relation is included in the query */
    app_reference?: App;
    type_reference?: AssetType;
}

export type Permission = {
    typeUuid?: string;
    appUuid: string;
    permission: string;

    /** These fields are only available when the relation is included in the query */
    app_reference?: App;
    type_reference?: AssetType;
};

