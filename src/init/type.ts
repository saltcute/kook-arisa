export interface ArisaStorage {
    "kookClientID": string,
    "kookClientSecret": string,

    "internalWebuiPort": number,
    "webuiUrl": string,

    "neteaseVIP": boolean,
    "neteaseEmail": string,
    "neteasePassword": string,

    "globalAdmins": string[],

    "streamerMiddlemanID": string,
    "streamerMiddlemanToken": string,

    "realIP"?: string
}