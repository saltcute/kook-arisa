import netease from "NeteaseCloudMusicApi";
import delay from "delay";
import { client } from "init/client";
import qrcode from "qrcode-terminal";

export class Netease {
    readonly REAL_IP?;
    constructor(realIP?: string) {
        this.REAL_IP = realIP;
        this.init();
    }
    private cookie?: string;
    async init() {
        let needLogin = false;
        let storedCookie: string | undefined = await client.config.getOne(
            "arisa::auth.netease.cookie"
        );
        if (storedCookie) {
            const res = await netease.login_status({ cookie: this.cookie });
            if (res.status == 200) {
                client.logger.info("Netease Music already logged in.");
            } else needLogin = true;
        } else needLogin = true;
        if (needLogin) {
            try {
                if (await client.config.getOne("neteaseVIP")) {
                    const res = await netease.login({
                        email: (
                            await client.config.getOne("neteaseEmail")
                        ).toString(),
                        password: (
                            await client.config.getOne("neteasePassword")
                        ).toString(),
                        realIP: this.REAL_IP,
                    });
                    if (res.body.code == 200 && res.body.cookie) {
                        client.logger.info("Netease Music log in success.");
                        storedCookie = res.body.cookie;
                    } else {
                        client.logger.info(
                            "Netease Music log in failed. Trying QR Code log in."
                        );
                        // Login failed
                        client.logger.debug(res);
                        // Start QR Code login
                        async function QRLogin() {
                            const QRKey = (
                                (await netease.login_qr_key({})).body as any
                            ).data.unikey;
                            const QRCodeImgBase64 = (
                                (
                                    await netease.login_qr_create({
                                        key: QRKey,
                                    })
                                ).body as any
                            ).data.qrurl;
                            qrcode.generate(QRCodeImgBase64);
                            client.logger.info(
                                "Please use the Netease Music app to scan the QR Code."
                            );
                            while (true) {
                                enum STATUS {
                                    CODE_EXPIRED = 800,
                                    WAITING_FOR_CODE_SCAN = 801,
                                    WAITING_FOR_LOGIN_CONFIRMATION = 802,
                                    LOGIN_SUCCESS = 803,
                                }
                                const res = (
                                    await netease.login_qr_check({
                                        key: QRKey,
                                    })
                                ).body as {
                                    code: number;
                                    message: string;
                                    cookie: string;
                                };
                                switch (res.code) {
                                    case STATUS.LOGIN_SUCCESS:
                                        storedCookie = res.cookie;
                                        return true;
                                    case STATUS.WAITING_FOR_CODE_SCAN:
                                        client.logger.info(
                                            "Waiting for QR Code scan..."
                                        );
                                        break;
                                    case STATUS.WAITING_FOR_LOGIN_CONFIRMATION:
                                        client.logger.info(
                                            "Waiting for confirmation..."
                                        );
                                        break;
                                    case STATUS.CODE_EXPIRED:
                                        client.logger.info(
                                            "QR Code expired. Retrying in 5 minutes..."
                                        );
                                        return false;
                                }
                                await delay(5 * 1000);
                            }
                        }
                        while (true) {
                            const res = await QRLogin();
                            if (res) break;
                            else await delay(5 * 60 * 1000);
                        }
                    }
                } else {
                    client.logger.info(
                        "Started without using a Netease account."
                    );
                }
            } catch (e) {
                client.logger.error(e);
                storedCookie = undefined;
            }
        }
        client.config.set("arisa::auth.netease.cookie", storedCookie);
        if (storedCookie) this.cookie = storedCookie;
    }
    async search(
        keywords: string,
        page = 1,
        limit = 5
    ): Promise<Netease.song[]> {
        const res = await netease.search({
            keywords,
            offset: (page - 1) * limit,
            limit,
            cookie: this.cookie,
            realIP: this.REAL_IP,
        });
        return (res.body.result as any).songs;
    }
    async cloudsearch(
        keywords: string,
        page = 1,
        limit = 5
    ): Promise<Netease.songDetail[]> {
        const res = await netease.cloudsearch({
            keywords,
            offset: (page - 1) * limit,
            limit,
            cookie: this.cookie,
            realIP: this.REAL_IP,
        });
        return (res.body.result as any).songs;
    }
    async getAlbum(id: number): Promise<{
        songs: Netease.song[];
        album: Netease.album;
        artist: Netease.artist;
    }> {
        const res = await netease.album({
            id,
            cookie: this.cookie,
            realIP: this.REAL_IP,
        });
        return {
            songs: (res.body as any).songs,
            album: (res.body as any).album,
            artist: (res.body as any).artist,
        };
    }
    async getSong(id: number): Promise<Netease.songDetail> {
        return (
            (
                await netease.song_detail({
                    ids: id.toString(),
                    cookie: this.cookie,
                    realIP: this.REAL_IP,
                })
            ).body.songs as any
        )[0];
    }
    async getSongMultiple(ids: string): Promise<Netease.songDetail[]> {
        return (
            await netease.song_detail({
                ids,
                cookie: this.cookie,
                realIP: this.REAL_IP,
            })
        ).body.songs as any;
    }
    async getSongUrl(id: number) {
        return (
            (
                await netease.song_url({
                    id,
                    cookie: this.cookie,
                    realIP: this.REAL_IP,
                })
            ).body.data as any
        )[0].url;
    }
    async getLyric(id: number): Promise<Netease.lyric> {
        return (
            await netease.lyric({
                id,
                cookie: this.cookie,
                realIP: this.REAL_IP,
            })
        ).body as any;
    }
    async getPlaylist(id: string): Promise<Netease.playlist> {
        return ((await netease.playlist_track_all({ id })).body as any).songs;
    }
}

const neteaseInstance = new Netease(
    client.config.hasSync("realIP")
        ? client.config.getSync("realIP").toString()
        : undefined
);
export default neteaseInstance;

export namespace Netease {
    export interface artist {
        name: string;
        id: number;
        picId: number;
        img1v1Id: number;
        briefDisc: string;
        picUrl: string;
        img1v1Url: string;
        albumSize: number;
        alias: string[];
        trans: string;
        musicSize: number;
    }
    export interface albumArtist {
        id: number;
        name: string;
        picUrl: string | null;
        alias: string[];
        albumSize: number;
        picId: number;
        fansGroup: null;
        img1v1Url: string;
        img1v1: number;
        trans: null;
    }
    export interface album {
        id: number;
        name: string;
        artist: albumArtist;
        publishTime: number;
        blurPicUrl?: string;
        size: number;
        copyrightId: number;
        status: number;
        picId: number;
        mark: number;
    }
    export interface song {
        id: number;
        name: string;
        artists: artist[];
        album: album;
        duration: number;
        copyrightId: number;
        status: number;
        alias: string[];
        rtype: number;
        ftype: number;
        mvid: number;
        fee: number;
        rUrl: null;
        mark: number;
    }
    export interface songDetail {
        /**
         * Song name
         */
        name: string;
        /**
         * Song ID
         */
        id: number;
        ar: {
            /**
             * Artist ID
             */
            id: number;
            /**
             * Artist name
             */
            name: string;
            tns: any[];
            alias: any[];
        }[];
        al: {
            /**
             * Album ID
             */
            id: number;
            /**
             * Album name
             */
            name: string;
            /**
             * Album cover
             */
            picUrl: string;
            tns: any[];
            pic_str: string;
            pic: number;
        };
        /**
         * Song duration
         */
        dt: number;
        // [key: string]: any
    }
    export interface lyric {
        sgc: boolean;
        sfy: boolean;
        qfy: boolean;
        lyricUser: {
            id: number;
            status: number;
            demand: number;
            userid: number;
            nickname: string;
            uptime: number;
        };
        lrc?: lyricContent;
        klyric?: lyricContent;
        tlyric?: lyricContent;
        romalrc?: lyricContent;
    }
    export type playlist = songDetail[];
    export interface lyricContent {
        version: number;
        lyric: string;
    }
}
