import Koice from "koice";
import { Controller } from "../type";
import { PassThrough, Readable } from "stream";
import ffmpeg, { ffprobe } from "fluent-ffmpeg";
import delay from "delay";
import * as fs from "fs";
import upath from "upath";
import netease from "../../command/netease/lib";
import qqmusic from "../../command/qq/lib";
import axios from "axios";
import { akarin } from "menu/arisa/command/lib";
import playlist from "../lib/playlist";
import { Streamer, playback, queueItem } from "../type";
import { Time } from "../lib/time";
import { MessageType } from "kasumi.js";

import spotify from "menu/arisa/command/spotify/lib/index";
const biliAPI = require("bili-api");

export class LocalStreamer extends Streamer {
    private controller: Controller;
    private koice: Koice | null = null;

    private isClosed = false;

    constructor(
        guildId: string,
        channelId: string,
        authorId: string,
        controller: Controller
    ) {
        super(guildId, channelId, authorId, controller);
        this.controller = controller;
        this.lastOperation = Date.now();
        this.ensureUsage();
    }
    private streamHasHead = false;
    private async initKoice() {
        await this.endPlayback();
        await this.koice?.close();
        for (let i = 0; i < 1 && this.koice == null; ++i) {
            this.koice = await Koice.create(
                this.controller.client,
                this.TARGET_CHANNEL_ID,
                {
                    // rtcpMux: false,
                    // bitrateFactor: 0.85,
                    // inputCodec: "s16le",
                }
            );
        }
        if (!(this.koice instanceof Koice)) {
            await this.disconnect("无法创建 Koice.js 实例");
            return false;
        }
        this.koice.on("close", (event) => {
            this.kasumi.logger.error(event);
            this.initKoice();
        });
        this.streamHasHead = false;
        if (this.nowPlaying) {
            await this.playback(this.nowPlaying);
        } else {
            await this.next();
        }
        return true;
    }
    async doConnect() {
        const { err, data } =
            await this.kasumi.API.channel.voiceChannelUserList(
                this.TARGET_CHANNEL_ID
            );
        if (err) {
            this.kasumi.logger.error(err);
        } else {
            this.audienceIds = new Set(data.map((v) => v.id));
            this.audienceIds.delete(this.kasumi.me.userId);
        }
        return this.initKoice();
    }

    async reconnect() {
        return this.initKoice();
    }

    async doDisconnect(message?: string | null): Promise<boolean> {
        const messageTarget = [
            ...(this.panel?.panelChannelArray || []).filter(
                (v) => v != this.TARGET_CHANNEL_ID
            ),
            this.TARGET_CHANNEL_ID,
        ];
        if (messageTarget && message !== null) {
            await Promise.all(
                messageTarget.map((v) => {
                    return this.panel?.client.API.message.create(
                        MessageType.MarkdownMessage,
                        v,
                        `播放结束，总时长 ${Time.timeToShortString(
                            (Date.now() - this.streamStart) / 1000
                        )}，原因：${message ? message : "无"}`
                    );
                })
            );
        }
        this.isClosed = true;
        if (this.koice) {
            this.koice.removeAllListeners("close");
            this.koice.on("close", () => {
                this.kasumi.logger.warn(
                    `Koice.js closed with method call on ${this.TARGET_GUILD_ID}/${this.TARGET_CHANNEL_ID}, message: ${message}`
                );
            });
        }
        this.endPlayback();
        for (const item of this.queue) {
            item.source = null;
        }
        await playlist.user.save(this, this.INVITATION_AUTHOR_ID);
        await this.koice?.close();
        return this.controller.returnStreamer(this);
    }
    readonly streamingServices = ["netease", "bilibili", "qqmusic", "spotify"];
    private isStreamingSource(
        payload: any
    ): payload is playback.extra.streaming {
        return this.streamingServices.includes(payload?.type);
    }
    private async getStreamingSource(
        input: playback.extra,
        meta?: playback.meta,
        timeout: number = 15 * 1000
    ): Promise<
        | {
              source: playback.source.playable;
              meta: playback.meta;
          }
        | undefined
    > {
        return new Promise(async (resolve, reject) => {
            const timer = setTimeout(() => {
                reject("Timed out while getting streaming source");
            }, timeout);
            const resolver = (payload: any) => {
                clearTimeout(timer);
                resolve(payload);
            };
            try {
                switch (input.type) {
                    case "netease": {
                        const song = await netease.getSong(input.data.songId);
                        const url = await netease.getSongUrl(input.data.songId);
                        const cache = (
                            await axios.get(url, {
                                responseType: "arraybuffer",
                            })
                        ).data;
                        resolver({
                            source: cache,
                            meta: meta || {
                                title: song.name,
                                artists: song.ar.map((v) => v.name).join(", "),
                                duration: song.dt,
                                cover: song.al.picUrl,
                            },
                        });
                        break;
                    }
                    case "bilibili": {
                        const { cids } = await biliAPI(
                            { bvid: input.data.bvid },
                            ["cids"]
                        ).catch((e: any) => {
                            this.kasumi.logger.error(e);
                        });
                        let part = 0;
                        if (cids[input.data.part]) {
                            part = input.data.part;
                        }
                        const cid = cids[part];
                        if (!cid) return;
                        const { data: res } = await axios({
                            url: "https://api.bilibili.com/x/player/playurl",
                            params: {
                                bvid: input.data.bvid,
                                cid,
                                fnval: 16,
                            },
                        });
                        const data = res.data;
                        const url = data.dash.audio[part].baseUrl;
                        const cache = (
                            await axios.get(url, {
                                responseType: "arraybuffer",
                                headers: {
                                    referer: "https://www.bilibili.com",
                                },
                            })
                        ).data;
                        resolver({
                            source: cache,
                            meta: meta || {
                                title: `${input.data.bvid} P${input.data.part}}`,
                                artists: "Unknown",
                                duration: data.timelength,
                                cover: akarin,
                            },
                        });
                        break;
                    }
                    case "qqmusic": {
                        const song = await qqmusic.getSong(input.data.songMId);
                        const url = await qqmusic.getSongUrl(
                            input.data.songMId,
                            "128",
                            input.data.mediaId
                        );
                        const cache = (
                            await axios.get(url, {
                                responseType: "arraybuffer",
                            })
                        ).data;
                        resolver({
                            source: cache,
                            meta: meta || {
                                title: song.track_info.name,
                                artists: song.track_info.singer
                                    .map((v) => v.name)
                                    .join(", "),
                                duration: song.track_info.interval,
                                cover: akarin,
                            },
                        });
                        break;
                    }
                    case "spotify": {
                        const info = await spotify.getTrackDownloadInfo(
                            input.data.uri
                        );
                        if (!spotify.isSuccessData(info)) return;
                        const cache = (
                            await axios.get(info.link, {
                                responseType: "arraybuffer",
                            })
                        ).data;
                        resolver({
                            source: cache,
                            meta: meta || {
                                title: info.metadata.title,
                                artists: info.metadata.artists,
                                duration: -1,
                                cover: info.metadata.cover,
                            },
                        });
                        break;
                    }
                }
            } catch (e) {
                reject(e);
            }
        });
    }

    async playSpotify(
        uri: string,
        meta?: playback.meta,
        forceSwitch: boolean = false
    ) {
        if (!meta) {
            const metadata = await spotify.getTrackMetadata(uri);
            if (spotify.isSuccessData(metadata)) {
                meta = {
                    title: metadata.title,
                    artists: metadata.artists,
                    duration: -1,
                    cover: metadata.cover,
                };
            } else {
                meta = {
                    title: `Unknown Spotify audio`,
                    artists: "Unknown",
                    duration: -1,
                    cover: akarin,
                };
            }
        }
        const extra: playback.extra.spotify = {
            type: "spotify",
            data: { uri },
            meta,
        };
        return this.playStreaming(extra, forceSwitch);
    }

    async playNetease(
        songId: number,
        meta?: playback.meta,
        forceSwitch: boolean = false
    ) {
        const extra: playback.extra.netease = {
            type: "netease",
            data: { songId },
            meta: meta || {
                title: `Unknown Netease Cloud Music audio`,
                artists: "Unknown",
                duration: -1,
                cover: akarin,
            },
        };
        return this.playStreaming(extra, forceSwitch);
    }
    async playQQMusic(
        songMId: string,
        mediaId: string,
        meta?: playback.meta,
        forceSwitch: boolean = false
    ) {
        const extra: playback.extra.qqmusic = {
            type: "qqmusic",
            data: { songMId, mediaId },
            meta: meta || {
                title: `Unknown QQ Music audio`,
                artists: "Unknown",
                duration: -1,
                cover: akarin,
            },
        };
        return this.playStreaming(extra, forceSwitch);
    }
    async playBilibili(
        bvid: string,
        part: number = 0,
        meta?: playback.meta,
        forceSwitch: boolean = false
    ) {
        const extra: playback.extra.bilibili = {
            type: "bilibili",
            data: { bvid, part },
            meta: meta || {
                title: `Unknown Bilibili video`,
                artists: "Unknown",
                duration: -1,
                cover: akarin,
            },
        };
        return this.playStreaming(extra, forceSwitch);
    }
    async playStreaming(
        extra: playback.extra.streaming,
        forceSwitch: boolean = false
    ) {
        let payload: queueItem = {
            meta: extra.meta,
            extra,
        };
        this.pushPayload(payload, forceSwitch);
    }
    async playBuffer(
        input: playback.source.cache,
        meta: playback.meta = {
            title: `Unknown file`,
            artists: "Unknown",
            duration: 0,
            cover: akarin,
        },
        forceSwitch: boolean = false
    ) {
        let payload: queueItem = {
            source: input,
            meta: meta,
            extra: {
                type: "buffer",
                meta,
            },
        };
        this.pushPayload(payload, forceSwitch);
    }
    async playLocal(input: playback.extra.local, forceSwitch: boolean = false) {
        const path = input.path
            .trim()
            .replace(/^['"](.*)['"]$/, "$1")
            .trim();
        if (fs.existsSync(path)) {
            if (fs.lstatSync(path).isDirectory()) {
                fs.readdirSync(path).forEach((file) => {
                    const fullPath = upath.join(path, file);
                    ffprobe(fullPath, async (err, data) => {
                        if (err) return;
                        if (
                            data.streams
                                .map((val) => val.codec_type)
                                .includes("audio")
                        ) {
                            let meta = {
                                title: `Local file: ${
                                    upath.parse(fullPath).base
                                }`,
                                artists: "Unknown",
                                duration: 0,
                                cover: akarin,
                            };
                            let payload: queueItem = {
                                meta,
                                extra: {
                                    type: "local",
                                    path: fullPath,
                                    meta,
                                },
                            };
                            this.pushPayload(payload, forceSwitch);
                        }
                    });
                });
            } else {
                let meta = {
                    title: `Local file: ${upath.parse(path).base}`,
                    artists: "Unknown",
                    duration: 0,
                    cover: akarin,
                };
                let payload: queueItem = {
                    meta,
                    extra: {
                        type: "local",
                        path,
                        meta,
                    },
                };
                this.pushPayload(payload, forceSwitch);
            }
        }
    }
    private pushPayload(payload: any, forceSwitch: boolean = false) {
        this.preload();
        this.queue.push(payload);
        if (!(this.previousStream && !forceSwitch)) {
            this.next();
        }
    }

    private lastOperation: number;
    private ensureUsage() {
        if (Date.now() - this.lastOperation > 30 * 60 * 1000) {
            this.disconnect("机器人闲置");
        } else {
            this.lastOperation = Date.now();
        }
        setTimeout(
            () => {
                this.ensureUsage();
            },
            15 * 60 * 1000
        );
    }

    private ffmpegInstance: ffmpeg.FfmpegCommand | undefined;

    private previousStream: boolean = false;
    currentMusic?: queueItem;
    private lastRead: number = -1;

    private _shuffle(array: any[]) {
        let currentIndex = array.length,
            randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex],
                array[currentIndex],
            ];
        }
        return array;
    }

    shuffle() {
        this.queue = this._shuffle(this.queue);
        playlist.user.save(this, this.INVITATION_AUTHOR_ID);
    }
    getQueue() {
        return this.queue;
    }
    clearQueue() {
        this.queue = [];
        playlist.user.save(this, this.INVITATION_AUTHOR_ID);
    }

    audienceIds: Set<string> = new Set();

    private paused: boolean = false;
    private previousPausedTime: number = 0;

    get pausedTime() {
        if (this.pauseStart)
            return this.previousPausedTime + (Date.now() - this.pauseStart);
        else return this.previousPausedTime;
    }
    get duration() {
        const bytesPerSecond =
            (this.OUTPUT_FREQUENCY * this.OUTPUT_CHANNEL * this.OUTPUT_BITS) /
            8;
        return this.currentBufferSize / bytesPerSecond;
    }
    get playedTime() {
        const bytesPerSecond =
            (this.OUTPUT_FREQUENCY * this.OUTPUT_CHANNEL * this.OUTPUT_BITS) /
            8;
        return this.currentChunkStart / bytesPerSecond;
        // if (this.playbackStart) return (Date.now() - this.playbackStart) - this.pausedTime;
        // else return 0;
    }

    isPaused() {
        return this.paused;
    }
    private pauseStart?: number;
    doPause() {
        this.pauseStart = Date.now();
        this.paused = true;
    }
    doResume() {
        if (this.pauseStart) {
            this.previousPausedTime += Date.now() - this.pauseStart;
            delete this.pauseStart;
        }
        this.paused = false;
    }

    queueMoveUp(index: number) {
        super.queueMoveUp(index);
        playlist.user.save(this, this.INVITATION_AUTHOR_ID);
    }
    queueMoveDown(index: number) {
        super.queueMoveDown(index);
        playlist.user.save(this, this.INVITATION_AUTHOR_ID);
    }
    queueDelete(index: number) {
        super.queueDelete(index);
        playlist.user.save(this, this.INVITATION_AUTHOR_ID);
    }

    setCycleMode(
        payload: "repeat_one" | "repeat" | "no_repeat" | "random" = "no_repeat"
    ) {
        super.setCycleMode(payload);
        playlist.user.save(this, this.INVITATION_AUTHOR_ID);
    }

    async previous(): Promise<queueItem | undefined> {
        if (this.hasOngoingSkip) return;
        try {
            this.hasOngoingSkip = true;
            let upnext: queueItem | undefined;
            switch (this.cycleMode) {
                case "no_repeat":
                    upnext = this.queue.pop();
                    break;
                case "repeat_one":
                    upnext = this.nowPlaying || this.queue.pop();
                    break;
                case "random":
                case "repeat":
                    if (this.nowPlaying) this.queue.unshift(this.nowPlaying);
                    upnext = this.queue.pop();
                    break;
            }
            if (upnext) {
                if (upnext.endMark) {
                    upnext.endMark = false;
                    this.shuffle();
                }
                this.nowPlaying = upnext;
                await this.playback(upnext);
                this.hasOngoingSkip = false;
                return upnext;
            }
            this.hasOngoingSkip = false;
        } catch (e) {
            this.kasumi.logger.error(e);
        }
    }
    private hasOngoingSkip = false;
    async next(bypass?: boolean): Promise<queueItem | undefined> {
        if (!bypass && this.hasOngoingSkip) return;
        try {
            this.hasOngoingSkip = true;
            let upnext: queueItem | undefined;
            switch (this.cycleMode) {
                case "no_repeat":
                    if (this.nowPlaying) delete this.nowPlaying.source;
                    upnext = this.queue.shift();
                    break;
                case "repeat_one":
                    if (this.nowPlaying) upnext = this.nowPlaying;
                    else upnext = this.queue.shift();
                    break;
                case "random":
                case "repeat":
                    if (this.nowPlaying) {
                        this.queue.push(this.nowPlaying);
                        delete this.nowPlaying.source;
                    }
                    upnext = this.queue.shift();
                    break;
            }
            if (upnext) {
                if (upnext.endMark) {
                    upnext.endMark = false;
                    this.shuffle();
                }
                this.nowPlaying = upnext;
                await this.playback(upnext);
                this.hasOngoingSkip = false;
                return upnext;
            }
            this.hasOngoingSkip = false;
        } catch (e) {
            this.kasumi.logger.error(e);
        }
    }

    private async preload() {
        // let item = this.queue[0];
        // if (item) {
        //     let prepared = await this.preparePayload(item);
        //     if (prepared) this.queue[0] = prepared;
        // }
    }

    private async preparePayload(payload: queueItem): Promise<
        | {
              source: playback.source;
              meta: playback.meta;
              extra: playback.extra;
          }
        | undefined
    > {
        if (payload.source instanceof Buffer) {
            // @ts-ignore
            return payload;
        }
        let extra = payload.extra,
            meta = payload.meta,
            source;
        if (this.isStreamingSource(extra)) {
            const stream = await this.getStreamingSource(
                extra,
                payload.meta
            ).catch((e) => {
                this.kasumi.logger.error(e);
                return undefined;
            });
            if (!stream) return undefined;
            source = stream.source;
            meta = stream.meta;
        }
        if (source) {
            payload.source = source;
            // @ts-ignore
            return payload;
        } else return undefined;
    }

    async endPlayback() {
        let lastFfmpegInstance = this.ffmpegInstance;
        if (this.currentMusic) {
            delete this.currentMusic.source;
            delete this.currentMusic;
        }
        delete this.ffmpegInstance;
        delete this.playbackStart;
        this.previousStream = false;
        lastFfmpegInstance?.kill("SIGINT");
        await delay(this.PUSH_INTERVAL + 50);
    }

    private get currentUsableStreamData() {
        return this.currentBufferSize - this.currentHeadSize;
    }

    jumpToPercentage(percent: number) {
        if (percent >= 0 && percent <= 1) {
            let newUsablePosition = Math.trunc(
                this.currentUsableStreamData * percent
            );
            newUsablePosition =
                newUsablePosition - (newUsablePosition % this.BYTES_PER_SAMPLE);
            this.currentChunkStart = this.currentHeadSize + newUsablePosition;
        }
    }

    async checkKoice() {
        if (!this.isClosed) {
            if (!this.koice || this.koice.isClose) {
                return this.reconnect();
            }
        }
    }

    private currentChunkStart = 0;
    private currentBufferSize = 0;
    private currentHeadSize = 0;
    private readonly OUTPUT_FREQUENCY = 48000;
    private readonly OUTPUT_CHANNEL = 2;
    private readonly OUTPUT_BITS = 16;
    private readonly PUSH_INTERVAL = 20;
    private get BYTES_PER_SAMPLE() {
        return this.OUTPUT_BITS / 8;
    }
    private readonly RATE =
        (this.OUTPUT_FREQUENCY * this.OUTPUT_CHANNEL * this.BYTES_PER_SAMPLE) /
        (1000 / this.PUSH_INTERVAL);
    async doPlayback(payload: queueItem): Promise<void> {
        try {
            if (this.queue.length && !this.queue.find((v) => v.endMark)) {
                this.queue[this.queue.length - 1].endMark = true;
            }
            // await this.checkKoice();
            this.preload();
            if (this.previousStream) {
                await this.endPlayback();
            }
            this.previousStream = true;

            let prepared = await this.preparePayload(payload);
            if (!prepared) {
                await this.endPlayback();
                await this.next(true);
                return;
            }
            let file = prepared.source;
            this.nowPlaying = this.currentMusic = prepared;
            playlist.user.save(this, this.INVITATION_AUTHOR_ID);

            var fileC: Readable;
            if (file instanceof Buffer) fileC = Readable.from(file);
            else if (file instanceof Readable) fileC = structuredClone(file);
            else fileC = fs.createReadStream(file);
            this.ffmpegInstance = ffmpeg()
                .input(fileC)
                // .audioCodec('pcm_u8')
                .audioCodec("pcm_s16le")
                // .audioCodec('pcm_s32le')
                .audioChannels(this.OUTPUT_CHANNEL)
                .audioFilter("volume=0.5")
                .audioFrequency(this.OUTPUT_FREQUENCY)
                .outputFormat("wav")
                .removeAllListeners("error")
                .on("error", async (err) => {
                    this.kasumi.logger.error(err);
                    if (this.previousStream) {
                        await this.endPlayback();
                        await this.next();
                    }
                    // const controller = this.controller, guildId = this.TARGET_GUILD_ID, channelId = this.TARGET_CHANNEL_ID, userId = this.INVITATION_AUTHOR_ID;
                    // await this.disconnect();
                    // await controller.joinChannel(guildId, channelId, userId);
                });
            const fileP = new PassThrough();
            this.ffmpegInstance.stream(fileP);
            var bfs: any[] = [];
            fileP.on("data", (chunk) => {
                bfs.push(chunk);
            });
            fileP.on("end", async () => {
                this.previousPausedTime = 0;
                this.playbackStart = Date.now();
                this.lastOperation = Date.now();
                var cache = Buffer.concat(bfs);
                bfs = [];
                this.currentChunkStart = 0;
                this.currentBufferSize = cache.length;
                for (let i = 0; i < cache.length; ++i) {
                    if (cache.subarray(i, i + 4).toString() == "data") {
                        this.currentChunkStart = i + 4;
                        break;
                    }
                }
                if (!this.currentChunkStart) {
                    await this.endPlayback();
                    return;
                }
                if (this.nowPlaying) {
                    if (this.nowPlaying.meta.duration < 0) {
                        this.nowPlaying.meta.duration = this.duration;
                    }
                }
                /**
                 * Rate for PCM audio
                 * 48000hz * 8 bit * 2 channel = 768kbps = 96KB/s
                 * Rate over 10ms, 96KB/s / 100 = 0.96KB/10ms = 960B/10ms
                 */
                // var rate = 960; // For pcm_u8;
                while (Date.now() - this.lastRead < 20);

                this.lastRead = Date.now();
                this.currentHeadSize = this.currentChunkStart;
                const headerChunk = cache.subarray(0, this.currentChunkStart);
                if (!this.streamHasHead) {
                    this.koice?.setFileHead(headerChunk);
                    this.streamHasHead = true;
                }

                while (
                    this.previousStream &&
                    this.currentChunkStart <= this.currentBufferSize
                ) {
                    if (!this.paused) {
                        this.lastRead = Date.now();
                        const chunk = cache.subarray(
                            this.currentChunkStart,
                            this.currentChunkStart + this.RATE
                        );
                        if (
                            this.previousStream &&
                            this.currentChunkStart <= this.currentBufferSize
                        ) {
                            let tmpChunk = Buffer.alloc(chunk.length);
                            for (
                                let i = 0;
                                i < chunk.length;
                                i += this.BYTES_PER_SAMPLE
                            ) {
                                let v = chunk.readInt16LE(i);
                                let after = v * this.volumeGain; // pcm_s16le
                                tmpChunk.writeInt16LE(after, i);
                            }
                            this.koice?.push(tmpChunk);
                        } else {
                            break;
                        }
                        this.currentChunkStart += this.RATE;
                    }
                    await delay(this.PUSH_INTERVAL);
                }
                if (this.previousStream) {
                    await this.endPlayback();
                    await this.next();
                }
            });
        } catch (e) {
            this.kasumi.logger.error(e);
            await this.endPlayback();
            await this.next();
        }
    }
}
