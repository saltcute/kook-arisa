import config from 'config';
import netease from 'NeteaseCloudMusicApi';
import { client } from 'init/client'



export class Netease {
    constructor() { this.init() };
    private cookie?: string;
    async init() {
        try {
            if (config.neteaseVIP) {
                this.cookie = (await netease.login({
                    email: config.neteaseEmail,
                    password: config.neteasePassword,
                    realIP: '106.11.249.99'
                })).body.cookie;
            }
        } catch (e) {
            client.logger.error(e);
            this.cookie = undefined;
        }
    }
    async search(keywords: string): Promise<Netease.song[]> {
        const res = await netease.search({ keywords, cookie: this.cookie, realIP: '106.11.249.99' });
        return (res.body.result as any).songs;
    }
    async getAlbum(id: number): Promise<{
        songs: Netease.song[],
        album: Netease.album,
        artist: Netease.artist
    }> {
        const res = await netease.album({ id, cookie: this.cookie, realIP: '106.11.249.99' });
        return {
            songs: (res.body as any).songs,
            album: (res.body as any).album,
            artist: (res.body as any).artist
        }
    }
    async getSong(id: number): Promise<Netease.songDetail> {
        return ((await netease.song_detail({ ids: id.toString(), cookie: this.cookie, realIP: '106.11.249.99' })).body.songs as any)[0];
    }
    async getSongMultiple(ids: string): Promise<Netease.songDetail[]> {
        return ((await netease.song_detail({ ids, cookie: this.cookie, realIP: '106.11.249.99' })).body.songs as any);
    }
    async getSongUrl(id: number) {
        return ((await netease.song_url({ id, cookie: this.cookie, realIP: '106.11.249.99' })).body.data as any)[0].url
    }
}

const neteaseInstance = new Netease();
export default neteaseInstance;


export namespace Netease {
    export interface artist {
        name: string,
        id: number,
        picId: number,
        img1v1Id: number,
        briefDisc: string,
        picUrl: string,
        img1v1Url: string,
        albumSize: number,
        alias: string[],
        trans: string,
        musicSize: number
    }
    export interface albumArtist {
        id: number,
        name: string,
        picUrl: string | null,
        alias: string[],
        albumSize: number,
        picId: number,
        fansGroup: null,
        img1v1Url: string,
        img1v1: number,
        trans: null
    }
    export interface album {
        id: number,
        name: string,
        artist: albumArtist,
        publishTime: number,
        blurPicUrl?: string,
        size: number,
        copyrightId: number,
        status: number,
        picId: number,
        mark: number
    }
    export interface song {
        id: number,
        name: string,
        artists: artist[],
        album: album,
        duration: number,
        copyrightId: number,
        status: number,
        alias: string[],
        rtype: number,
        ftype: number,
        mvid: number,
        fee: number,
        rUrl: null,
        mark: number
    }
    export interface songDetail {
        /**
         * Song name
         */
        name: string,
        /**
         * Song ID
         */
        id: number,
        ar: {
            /**
             * Artist ID
             */
            id: number,
            /**
             * Artist name
             */
            name: string,
            tns: any[],
            alias: any[]
        }[],
        al: {
            /**
             * Album ID
             */
            id: number,
            /**
             * Album name
             */
            name: string,
            /**
             * Album cover
             */
            picUrl: string,
            tns: any[],
            pic_str: string,
            pic: number
        },
        /**
         * Song duration
         */
        dt: number,
        [key: string]: any
    }
}