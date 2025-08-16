export interface ArisaStorage {
    "arisa::config.spotify.apiEndpoint"?: string;

    "arisa::config.assets.progress.start": string;
    "arisa::config.assets.progress.bar": string;
    "arisa::config.assets.progress.end": string;
    "arisa::config.assets.progress.start-dot": string;
    "arisa::config.assets.progress.bar-dot": string;
    "arisa::config.assets.progress.end-dot": string;

    "arisa::config.assets.logo.bilibili": string;
    "arisa::config.assets.logo.qqmusic": string;
    "arisa::config.assets.logo.neteasecloud": string;
    "arisa::config.assets.logo.spotify": string;

    kookClientID: string;
    kookClientSecret: string;

    internalWebuiPort: number;
    webuiUrl: string;

    "arisa::auth.netease.cookie"?: string;
    "arisa::auth.netease.enabled": boolean;
    "arisa::auth.netease.phone.number": string;
    "arisa::auth.netease.phone.country"?: string;

    QQCookieCode: string;

    "arisa::session.ongoing": {
        targetChannelId: string;
        targetGuildId: string;
        invitationAuthorId: string;
        invitationTextChannelId?: string;
    }[];

    globalAdmins: string[];

    realIP?: string;
}
