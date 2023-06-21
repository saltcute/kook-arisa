import Kasumi from 'kasumi.js';
import Koice from 'koice';
import { Controller } from '.';
import { PassThrough, Readable } from 'stream';
import ffmpeg, { ffprobe } from 'fluent-ffmpeg';
import delay from 'delay';
import * as fs from 'fs';
import upath from 'upath';
import netease from '../command/netease/lib';
import axios from 'axios';
import { client } from 'init/client';
import { akarin } from '../command/netease/lib/card';
import playlist from './playlist';

const biliAPI = require('bili-api');

export namespace playback {
    export type source = source.playable;
    export interface meta {
        title: string,
        artists: string,
        duration: number,
        cover: string
    }
    export namespace source {
        export type cache = Buffer | Readable;
        export type playable = cache;
    }
    export type extra = extra.playable | extra.streaming;
    export namespace extra {
        export interface base {
            type: string,
            data?: any
            meta: meta
        }
        export interface netease extends base {
            type: 'netease',
            data: {
                songId: number
            }
        }
        export interface bilibili extends base {
            type: 'bilibili',
            data: {
                bvid: string,
                part: number
            }
        }
        export interface readable extends base {
            type: 'readable'
        }
        export interface buffer extends base {
            type: 'buffer'
        }
        export interface local extends base {
            type: 'local',
            path: string
        }

        export type cache = buffer | readable;
        export type playable = local | cache;
        export type streaming = netease | bilibili;
    }
}


export type queueItem = {
    source?: playback.source.cache,
    meta: playback.meta,
    extra: playback.extra
};
export class Streamer {
    readonly STREAMER_TOKEN: string;
    readonly TARGET_CHANNEL_ID: string;
    readonly TARGET_GUILD_ID: string;
    readonly INVITATION_AUTHOR_ID: string;
    private controller: Controller;
    readonly kasumi: Kasumi;
    private readonly koice: Koice;

    constructor(token: string, guildId: string, channelId: string, authorId: string, controller: Controller) {
        this.STREAMER_TOKEN = token;
        this.TARGET_CHANNEL_ID = channelId;
        this.TARGET_GUILD_ID = guildId
        this.INVITATION_AUTHOR_ID = authorId;
        this.controller = controller;
        this.kasumi = new Kasumi({
            type: 'websocket',
            token: this.STREAMER_TOKEN
        });
        this.kasumi.fetchMe();
        this.koice = new Koice(this.STREAMER_TOKEN);
        this.lastOperation = Date.now();
        this.ensureUsage();
    }
    async connect() {
        const { err, data } = await this.kasumi.API.channel.voiceChannelUserList(this.TARGET_CHANNEL_ID)
        if (err) {
            client.logger.error(err);
        } else {
            this.audienceIds = new Set(data.map(v => v.id));
            this.audienceIds.delete(this.kasumi.me.userId);
        }
        this.koice.connectWebSocket(this.TARGET_CHANNEL_ID);
        await this.koice.startStream(this.stream);
        return this;
    }

    async disconnect(): Promise<boolean> {
        await this.koice.close();
        return this.controller.returnStreamer(this);
    }
    readonly streamingServices = ['netease', 'bilibili'];
    private isStreamingSource(payload: any): payload is playback.extra.streaming {
        return this.streamingServices.includes(payload?.type);
    }
    private async getStreamingSource(
        input: playback.extra,
        meta?: playback.meta
    ): Promise<{
        source: playback.source.playable,
        meta: playback.meta
    } | undefined> {
        try {
            switch (input.type) {
                case 'netease': {
                    const song = await netease.getSong(input.data.songId);
                    const url = await netease.getSongUrl(input.data.songId);
                    const cache = (await axios.get(url, { responseType: 'arraybuffer' })).data
                    return {
                        source: cache,
                        meta: meta || {
                            title: song.name,
                            artists: song.ar.map(v => v.name).join(', '),
                            duration: song.dt,
                            cover: song.al.picUrl
                        }
                    }
                }
                case 'bilibili': {
                    const { cids } = await biliAPI({ bvid: input.data.bvid }, ['cids']).catch((e: any) => { client.logger.error(e); });
                    let part = 0;
                    if (cids[input.data.part]) {
                        part = input.data.part
                    }
                    const cid = cids[part];
                    if (!cid) return;
                    const { data: res } = await axios({
                        url: "https://api.bilibili.com/x/player/playurl",
                        params: {
                            bvid: input.data.bvid,
                            cid,
                            qn: 16,
                            fnval: 80
                        }
                    });
                    const data = res.data
                    const url = data.dash.audio[part].baseUrl;
                    const cache = (await axios.get(url, { responseType: 'arraybuffer' })).data;
                    return {
                        source: cache,
                        meta: meta || {
                            title: `${input.data.bvid} P${input.data.part}}`,
                            artists: "Unknown",
                            duration: data.timelength,
                            cover: akarin
                        }
                    }
                }
            }
        } catch (e) {
            client.logger.error(e);
            return undefined;
        }
    }

    async playNetease(songId: number, meta: playback.meta, forceSwitch: boolean = false) {
        const extra: playback.extra.netease = {
            type: 'netease',
            data: { songId },
            meta
        }
        return this.playStreaming(meta, extra, forceSwitch);
    }
    async playBilibili(bvid: string, part: number = 0, meta: playback.meta, forceSwitch: boolean = false) {
        const extra: playback.extra.bilibili = {
            type: 'bilibili',
            data: { bvid, part },
            meta
        }
        return this.playStreaming(meta, extra, forceSwitch);
    }
    async playStreaming(meta: playback.meta, extra: playback.extra.streaming, forceSwitch: boolean = false) {
        let payload: queueItem = {
            meta: meta || {
                title: `Unknown streaming service audio`,
                artists: 'Unknown',
                duration: 0
            },
            extra
        }
        this.pushPayload(payload, forceSwitch);
    }
    async playBuffer(
        input: playback.source.cache,
        meta: playback.meta = {
            title: `Unknown file`,
            artists: 'Unknown',
            duration: 0,
            cover: akarin
        },
        forceSwitch: boolean = false
    ) {
        let payload: queueItem = {
            source: input,
            meta: meta,
            extra: {
                type: 'buffer',
                meta
            }
        }
        this.pushPayload(payload, forceSwitch);
    }
    async playLocal(input: playback.extra.local, forceSwitch: boolean = false) {
        const path = input.path.trim().replace(/^['"](.*)['"]$/, '$1').trim();
        if (fs.existsSync(path)) {
            if (fs.lstatSync(path).isDirectory()) {
                fs.readdirSync(path).forEach((file) => {
                    const fullPath = upath.join(path, file);
                    ffprobe(fullPath, async (err, data) => {
                        if (err) return;
                        if (data.streams.map(val => val.codec_type).includes('audio')) {
                            let meta = {
                                title: `Local file: ${upath.parse(fullPath).base}`,
                                artists: 'Unknown',
                                duration: 0,
                                cover: akarin
                            };
                            let payload: queueItem = {
                                meta,
                                extra: {
                                    type: 'local',
                                    path: fullPath,
                                    meta
                                }
                            }
                            this.pushPayload(payload, forceSwitch);
                        }
                    })
                })
            } else {
                let meta = {
                    title: `Local file: ${upath.parse(path).base}`,
                    artists: 'Unknown',
                    duration: 0,
                    cover: akarin
                };
                let payload: queueItem = {
                    meta,
                    extra: {
                        type: 'local',
                        path,
                        meta
                    }
                }
                this.pushPayload(payload, forceSwitch);
            }
        }
    }
    private pushPayload(payload: any, forceSwitch: boolean = false) {
        this.preload();
        this.queue.push(payload)
        if (!(this.previousStream && !forceSwitch)) this.next();
    }

    private lastOperation: number;
    private ensureUsage() {
        if (Date.now() - this.lastOperation > 30 * 60 * 1000) {
            this.disconnect();
        } else {
            this.lastOperation = Date.now();
        }
        setTimeout(() => { this.ensureUsage() }, 15 * 60 * 1000);
    }

    private fileP = new PassThrough();
    private ffmpegInstance: ffmpeg.FfmpegCommand | undefined;


    private previousStream: boolean = false;
    currentMusic?: queueItem;
    private lastRead: number = -1;

    readonly stream = new Readable({
        read(size) {
            return true;
        },
    })

    private _shuffle(array: any[]) {
        let currentIndex = array.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
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
        if (this.pauseStart) return this.previousPausedTime + (Date.now() - this.pauseStart);
        else return this.previousPausedTime;
    }
    get duration() {
        const bytesPerSecond = (this.OUTPUT_FREQUENCY * this.OUTPUT_CHANNEL * this.OUTPUT_BITS) / 8
        return this.currentBufferSize / bytesPerSecond;
    }
    get playedTime() {
        const bytesPerSecond = (this.OUTPUT_FREQUENCY * this.OUTPUT_CHANNEL * this.OUTPUT_BITS) / 8
        return this.currentChunkStart / bytesPerSecond;
        // if (this.playbackStart) return (Date.now() - this.playbackStart) - this.pausedTime;
        // else return 0;
    }

    isPaused() {
        return this.paused;
    }
    private pauseStart?: number;
    pause() {
        this.pauseStart = Date.now();
        this.paused = true;
    }
    resume() {
        if (this.pauseStart) {
            this.previousPausedTime += Date.now() - this.pauseStart;
            delete this.pauseStart;
        }
        this.paused = false;
    }


    private queue: Array<queueItem> = [];

    queueMoveUp(index: number) {
        if (index) {
            const item = this.queue[index], previous = this.queue[index - 1];
            if (item && previous) {
                this.queue[index] = previous;
                this.queue[index - 1] = item;
            }
        } else {
            const item = this.queue.shift();
            if (item) {
                this.queue.push(item);
            }
        }
        playlist.user.save(this, this.INVITATION_AUTHOR_ID);
    }
    queueMoveDown(index: number) {
        if (index != this.queue.length - 1) {
            const item = this.queue[index], next = this.queue[index + 1];
            if (item && next) {
                this.queue[index] = next;
                this.queue[index + 1] = item;
            }
        } else {
            const item = this.queue.pop();
            if (item) {
                this.queue.unshift(item);
            }
        }
        playlist.user.save(this, this.INVITATION_AUTHOR_ID);
    }
    queueDelete(index: number) {
        const item = this.queue[index];
        this.queue = this.queue.filter(v => v != item);
        playlist.user.save(this, this.INVITATION_AUTHOR_ID);
    }

    setCycleMode(payload: 'repeat_one' | 'repeat' | 'no_repeat' = 'no_repeat') {
        if (payload !== 'repeat_one' && payload !== 'repeat' && payload != 'no_repeat') payload = 'no_repeat';
        this.cycleMode = payload;
        playlist.user.save(this, this.INVITATION_AUTHOR_ID);
    }
    getCycleMode() {
        return this.cycleMode;
    }

    private cycleMode: 'repeat_one' | 'repeat' | 'no_repeat' = 'no_repeat';
    nowPlaying?: queueItem;


    async previous(): Promise<queueItem | undefined> {
        try {
            let upnext: queueItem | undefined;
            switch (this.cycleMode) {
                case 'no_repeat':
                    upnext = this.queue.pop();
                    break;
                case 'repeat_one':
                    upnext = this.nowPlaying || this.queue.pop();
                    break;
                case 'repeat':
                    if (this.nowPlaying) this.queue.unshift(this.nowPlaying);
                    upnext = this.queue.pop();
                    break;
            }
            if (upnext) {
                this.nowPlaying = upnext;
                await this.playback(upnext);
                return upnext;
            }
        } catch { };
    }
    async next(): Promise<queueItem | undefined> {
        try {
            let upnext: queueItem | undefined;
            switch (this.cycleMode) {
                case 'no_repeat':
                    if (this.nowPlaying) delete this.nowPlaying.source;
                    upnext = this.queue.shift();
                    break;
                case 'repeat_one':
                    if (this.nowPlaying) upnext = this.nowPlaying;
                    else this.queue.shift();
                    break;
                case 'repeat':
                    if (this.nowPlaying) {
                        this.queue.push(this.nowPlaying);
                        delete this.nowPlaying.source;
                    }
                    upnext = this.queue.shift();
                    break;
            }
            if (upnext) {
                this.nowPlaying = upnext;
                await this.playback(upnext);
                return upnext;
            }
        } catch { }
    }

    private async preload() {
        let item = this.queue[0];
        if (item) {
            await this.preparePayload(item);
        }
    }

    private async preparePayload(payload: queueItem): Promise<{
        source: playback.source,
        meta: playback.meta,
        extra: playback.extra
    } | undefined> {
        let extra = payload.extra, meta = payload.meta, source;
        if (this.isStreamingSource(extra)) {
            const stream = (await this.getStreamingSource(extra, payload.meta));
            if (!stream) return undefined;
            source = stream.source;
            meta = stream.meta;
        }
        if (source) return { source, meta, extra: payload.extra }
        else return undefined;
    }

    playbackStart?: number;

    async endPlayback() {
        delete this.currentMusic;
        delete this.playbackStart;
        this.previousStream = false;
        this.ffmpegInstance?.kill("SIGSTOP");
        await delay(this.PUSH_INTERVAL + 50);
        this.fileP?.removeAllListeners();
        this.fileP?.destroy();
        this.fileP = new PassThrough();
    }

    jumpToPercentage(percent: number) {
        if (percent >= 0 && percent <= 1) {
            this.currentChunkStart = Math.trunc(this.currentBufferSize * percent);
        }
    }


    private currentChunkStart = 0;
    private currentBufferSize = 0;
    private readonly OUTPUT_FREQUENCY = 48000;
    private readonly OUTPUT_CHANNEL = 2;
    private readonly OUTPUT_BITS = 8;
    private readonly PUSH_INTERVAL = 50;
    private readonly RATE = (this.OUTPUT_FREQUENCY * this.OUTPUT_CHANNEL * this.OUTPUT_BITS) / 8 / (1000 / this.PUSH_INTERVAL)
    async playback(payload: queueItem): Promise<void> {
        try {
            this.preload();
            if (this.previousStream) {
                await this.endPlayback();
            }
            this.previousStream = true;

            let prepared = await this.preparePayload(payload);
            if (!prepared) {
                await this.endPlayback();
                await this.next();
                return;
            }
            let file = prepared.source;
            this.currentMusic = prepared;
            playlist.user.save(this, this.INVITATION_AUTHOR_ID);

            var fileC: Readable;
            if (file instanceof Buffer) fileC = Readable.from(file);
            else if (file instanceof Readable) fileC = structuredClone(file);
            else fileC = fs.createReadStream(file);
            this.ffmpegInstance = ffmpeg()
                .input(fileC)
                .audioCodec('pcm_u8')
                // .audioCodec('pcm_s16le')
                .audioChannels(this.OUTPUT_CHANNEL)
                // .audioFilter('volume=0.5')
                .audioFrequency(this.OUTPUT_FREQUENCY)
                .outputFormat('wav');
            this.ffmpegInstance
                .stream(this.fileP);
            this.ffmpegInstance.on('error', async (err) => {
                client.logger.error(err);
                if (this.previousStream) {
                    await this.endPlayback();
                    await this.next();
                }
                // const controller = this.controller, guildId = this.TARGET_GUILD_ID, channelId = this.TARGET_CHANNEL_ID, userId = this.INVITATION_AUTHOR_ID;
                // await this.disconnect();
                // await controller.joinChannel(guildId, channelId, userId);
            })
            var bfs: any[] = [];
            this.fileP.on('data', (chunk) => {
                bfs.push(chunk)
            })
            this.fileP.on('end', async () => {
                this.previousPausedTime = 0;
                this.playbackStart = Date.now();
                this.lastOperation = Date.now();
                var cache = Buffer.concat(bfs);
                const FILE_HEADER_SIZE = 44;
                this.currentChunkStart = 0;
                this.currentBufferSize = cache.length;
                /**
                 * Rate for PCM audio 
                 * 48000Khz * 8 bit * 2 channel = 768kbps = 96KB/s
                 * Rate over 10ms, 96KB/s / 100 = 0.96KB/10ms = 960B/10ms
                 */
                // var rate = 960; // For pcm_u8;
                while (Date.now() - this.lastRead < 20);

                this.lastRead = Date.now();
                const chunk = cache.subarray(this.currentChunkStart, this.currentChunkStart + FILE_HEADER_SIZE + 1);
                if (this.previousStream && this.currentChunkStart <= this.currentBufferSize) {
                    this.stream.push(chunk);
                }
                this.currentChunkStart += FILE_HEADER_SIZE + 1;

                while (this.previousStream && this.currentChunkStart <= this.currentBufferSize) {
                    if (!this.paused) {
                        this.lastRead = Date.now();
                        const chunk = cache.subarray(this.currentChunkStart, this.currentChunkStart + this.RATE + 1);
                        if (this.previousStream && this.currentChunkStart <= this.currentBufferSize) {
                            this.stream.push(chunk);
                        }
                        else {
                            break;
                        }
                        this.currentChunkStart += this.RATE + 1;
                    }
                    await delay(this.PUSH_INTERVAL);
                }
                if (this.previousStream) {
                    await this.endPlayback();
                    await this.next();
                }
            });
        } catch {
            await this.endPlayback();
            await this.next();
        }
    }
}
