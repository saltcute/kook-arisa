import Kasumi, { CombineOnlyWhenNotEqual, DefiniteStorage, Equals, StringKeyOf, Config, Storage } from "kasumi.js";


interface CustomStorage {
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

declare class CustomKasumi extends Kasumi {
    public config: CustomConfig;
}

declare class CustomConfig extends Config {
    public hasSync<P extends StringKeyOf<CustomStorage>, T extends keyof DefiniteStorage, K extends string>(key: T | K): this is { getSync(key: T | K): NonNullable<Storage[T | K] | CustomStorage[P]> } & this;

    public getSync<T extends StringKeyOf<CustomStorage>>(key: T): CustomStorage[T];
    public getSync<T extends StringKeyOf<DefiniteStorage>, K extends StringKeyOf<Storage>>(key: T | K): Storage[T | K];

    public getOne<T extends StringKeyOf<CustomStorage>>(key: T): Promise<CustomStorage[T]>;
    public getOne<T extends StringKeyOf<DefiniteStorage>, K extends StringKeyOf<Storage>>(key: T | K): Promise<Storage[T | K]>;
}

export default CustomKasumi;