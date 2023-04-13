import config from 'config';
import netease from 'NeteaseCloudMusicApi';
import { songDetail } from './type';



export class Netease {
    constructor() { this.init() };
    private cookie?: string;
    async init() {
        if (config.neteaseVIP) {
            this.cookie = (await netease.login({
                email: config.neteaseEmail,
                password: config.neteasePassword
            })).body.cookie;
        }
    }
    async search(keywords: string): Promise<Netease.song[]> {
        const res = await netease.search({ keywords, cookie: this.cookie });
        return (res.body.result as any).songs;
    }
    async getAlbum(id: number): Promise<{
        songs: Netease.song[],
        album: Netease.album,
        artist: Netease.artist
    }> {
        const res = await netease.album({ id, cookie: this.cookie });
        return {
            songs: (res.body as any).songs,
            album: (res.body as any).album,
            artist: (res.body as any).artist
        }
    }
    async getSong(id: number): Promise<songDetail> {
        return ((await netease.song_detail({ ids: id.toString(), cookie: this.cookie })).body.songs as any)[0];
    }
    async getSongUrl(id: number) {
        return ((await netease.song_url({ id, cookie: this.cookie })).body.data as any)[0].url
    }
}

export default new Netease();


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
}