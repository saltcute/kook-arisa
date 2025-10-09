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

    "arisa::config.maxConcurrentStreams"?: number;

    "arisa::config.oauth.kook.client.id": string;
    "arisa::config.oauth.kook.client.secret": string;

    "arisa::config.webui.url": string;
    "arisa::config.webui.port": number;

    "arisa::auth.netease.cookie"?: string;
    "arisa::auth.netease.enabled": boolean;
    "arisa::auth.netease.phone.number": string;
    "arisa::auth.netease.phone.country"?: string;

    "arisa::config.netease.realIP"?: string;

    "arisa::auth.QQMusicCookieRefresh.code": string;

    "arisa::session.ongoing": {
        
        targetChannelId: string;
        targetGuildId: string;
        invitationAuthorId: string;
        invitationTextChannelId?: string;
    }[];

    "arisa::config:admins": string[];
}
