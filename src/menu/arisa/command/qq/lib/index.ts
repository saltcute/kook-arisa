// @ts-ignore
import qqmusic from "@saltcute/qq-music-api";
import { client } from "init/client";

export class QQMusic {
    constructor(cookie?: string) {
        if (cookie) this.updateCookie(cookie);
    };
    get cookie() {
        return qqmusic.cookie;
    }
    updateCookie(cookie: string) {
        const obj: Object = Object.fromEntries(cookie.split(";").map(v => v.trim()).map(v => {
            const split = v.split("=");
            return [split[0], split[1]];
        }));
        if (obj.hasOwnProperty("qqmusic_key") || obj.hasOwnProperty("qm_keyst")) {
            qqmusic.setCookie(obj);
            client.config.set("arisa::QQMusic.cookie", cookie);
        }
    }
    async search(keywords: string): Promise<QQMusic.API.Search> {
        const res = await qqmusic.api("search", { key: keywords });
        return res;
    }
    async getAlbum(mid: string) {
        const album: QQMusic.API.Album = await qqmusic.api("album", { mid });
        const songs: QQMusic.API.AlbumSongs = await qqmusic.api("album/songs", { mid });
        return {
            songs,
            album: album,
            artist: album.ar
        }
    }
    async getSong(songmid: string): Promise<QQMusic.API.Song> {
        return await qqmusic.api("song", { songmid });
    }
    /**
     * Get the asset URL of a song
     * @param mid Song mid
     * @param type Audio quality
     * @param mediaId strMediaId in other endpoint
     * @returns Url of the song
     */
    async getSongUrl(mid: string, type: "128" | "320" | "m4a" | "ape" | "flac" = "128", mediaId?: string) {
        return await qqmusic.api("song/url", { id: mid, type, mediaId });
    }
    async getLyric(songmid: string): Promise<QQMusic.API.Lyric> {
        return await qqmusic.api("lyric", { songmid });
    }
}

const data = client.config.getSync("arisa::QQMusic.cookie");
const cookie = typeof data == 'string' ? data : "";
const qqInstance = new QQMusic(cookie);
export default qqInstance;


export namespace QQMusic {
    export namespace Pattern {
        export interface Artist {
            id: number,
            mid: string,
            /**
             * Artist name
             */
            name: string,
            pmid: string,
            title: string,
            type: number,
            uin: number
        }
        export interface Pay {
            pay_down: number,
            pay_month: number,
            pay_play: number,
            pay_status: number,
            price_album: number,
            price_track: number,
            time_free: number
        }
        export interface Song {
            singer: Artist[]
            name: string,
            songid: number,
            songmid: string,
            songname: string,
            albumid: number,
            albummid: string,
            albumname: string,
            /**
             * Song duration in seconds.
             */
            interval: number,
            strMediaMid: string,
            /**
             * Size of 128kbps source. 0 for not available.
             */
            size128: string,
            /**
             * Size of 320kbps source. 0 for not available.
             */
            size320: string,
            /**
             * Size of APE source. 0 for not available.
             */
            sizeape: string,
            /**
             * Size of FLAC source. 0 for not available.
             */
            sizeflac: string,
            pay: Pay
        }
        export interface Album {
            id: number,
            mid: string,
            name: string,
            title: string,
            subtitle: string,
            time_public: string,
            pmid: string
        }
        export interface MusicVideo {
            id: number,
            vid: string,
            name: string,
            title: string,
            vt: number
        }
        export interface DetailSong {
            id: number,
            type: number,
            mid: string,
            name: string,
            title: string,
            subtitle: string,
            singer: Artist[],
            album: Album,
            mv: MusicVideo,
            /**
             * Song length in seconds.
             */
            interval: number,
            isonly: number,
            language: number,
            genre: number,
            index_cd: number,
            index_album: number,
            time_public: string,
            status: number,
            fnote: number,
            file: {
                media_mid: string,
                size_24aac: number,
                size_48aac: number,
                size_96aac: number,
                size_192ogg: number,
                size_192aac: number,
                size_128mp3: number,
                size_320mp3: number,
                size_ape: number,
                size_flac: number,
                size_dts: number,
                size_try: number,
                try_begin: number,
                try_end: number,
                url: string,
                size_hires: number,
                hires_sample: number,
                hires_bitdepth: number,
                b_30s: number,
                e_30s: number,
                size_96ogg: number,
                size_360ra: number[],
                size_dolby: number,
                size_new: number[]
            },
            pay: Pay,
            action: {
                switch: number,
                msgid: number,
                alert: number,
                icons: number,
                msgshare: number,
                msgfav: number,
                msgdown: number,
                msgpay: number,
                switch2: number,
                icon2: number
            },
            ksong: { id: number, mid: string },
            volume: { gain: number, peak: number, lra: number },
            label: string,
            url: string,
            bpm: number,
            version: number,
            trace: string,
            data_type: number,
            modify_stamp: number,
            pingpong: string,
            aid: number,
            ppurl: string,
            tid: number,
            ov: number,
            sa: number,
            es: string,
            vs: string[],
            vi: number[],
            ktag: string,
            vf: number[]
        }
        export interface DetailAlbum {
            title: string,
            /**
             * Url to album cover. The link could be without protocol.
             */
            picurl: string,
            id: number,
            albumName: string,
            genre: string,
            language: string,
            albumType: string,
            company: string,
            /**
             * Release date. YYYY-MM-DD.
             */
            ctime: string,
            /**
             * Album description.
             */
            desc: string,
            price: number,
            albumIsBuy: boolean,
            wikiurl: string,
            isDigitalRecords: boolean,
            name: string,
            subTitle: string,
            ar: Pattern.Artist[],
            mid: string,
            /**
             * Release date. YYYY-MM-DD.
             */
            publishTime: string
        }
        export interface Metadata {
            id: number,
            value: string,
            mid: string,
            type: number,
            show_type: number,
            is_parent: number,
            picurl: string,
            read_cnt: number,
            author: string,
            jumpurl: string,
            ori_picurl: string
        }
        export interface Info {
            title: string,
            type: string,
            content: Metadata[],
            pos: number,
            more: number,
            selected: string,
            use_platform: number
        }
    }
    export namespace API {
        export interface Search {
            list: Pattern.Song[],
            pageNo: number,
            pageSize: number,
            total: number,
            key: string,
            t: number,
            type: string
        }
        export interface Album extends Pattern.DetailAlbum { }
        export interface AlbumSongs {
            list: Pattern.DetailSong[]
        }
        export interface Song {
            info: {
                company: Pattern.Info,
                genre: Pattern.Info,
                intro: Pattern.Info,
                lan: Pattern.Info,
                pub_time: Pattern.Info
            },
            extras: { name: string, transname: string, subtitle: string, from: string, wikiurl: string },
            track_info: Pattern.DetailSong
        }
        export interface Lyric {
            retcode: number,
            code: number,
            subcode: number,
            /** LRC format lyric */
            lyric: string,
            /** LRC format lyric */
            trans: string
        }
    }
}