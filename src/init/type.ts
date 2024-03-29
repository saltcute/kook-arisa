export interface ArisaStorage {
    "kookClientID": string,
    "kookClientSecret": string,

    "internalWebuiPort": number,
    "webuiUrl": string,

    "neteaseVIP": boolean,
    "neteaseEmail": string,
    "neteasePassword": string,

    "QQCookieCode": string,

    "arisa::session.ongoing": {
        targetChannelId: string,
        targetGuildId: string,
        invitationAuthorId: string,
        invitationTextChannelId?: string
    }[],

    "globalAdmins": string[],

    "streamerMiddlemanID": string,
    "streamerMiddlemanToken": string,

    "realIP"?: string,

    "streamers": string[]
}