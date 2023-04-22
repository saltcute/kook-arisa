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

export namespace playback {
    export type source = source.playable | source.streaming;
    export interface meta {
        title: string,
        artists: string,
        duration: number
    }
    export namespace source {
        export interface netease {
            type: 'netease',
            data: {
                songId: number
            }
        }
        export type local = string;
        export type cache = Buffer | Readable;
        export type playable = local | cache;
        export type streaming = netease;
    }
    export type extra = extra.playable | extra.streaming;
    export namespace extra {
        export interface netease {
            type: 'netease',
            data: {
                songId: number,
                meta?: meta
            }
        }
        export interface readable {
            type: 'readable'
        }
        export interface buffer {
            type: 'buffer'
        }
        export interface local {
            type: 'local'
        }

        export type cache = buffer | readable;
        export type playable = local | cache;
        export type streaming = netease;
    }
}


export type queueItem = {
    source: playback.source | Promise<playback.source>
    meta: playback.meta,
    extra?: playback.extra
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
        this.STREAMER_TOKEN = structuredClone(token);
        this.TARGET_CHANNEL_ID = structuredClone(channelId);
        this.TARGET_GUILD_ID = structuredClone(guildId)
        this.INVITATION_AUTHOR_ID = structuredClone(authorId);
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
        this.koice.connectWebSocket(this.TARGET_CHANNEL_ID);
        await this.koice.startStream(this.stream);
        return this;
    }

    async disconnect(): Promise<boolean> {
        await this.koice.close();
        return this.controller.returnStreamer(this);
    }
    readonly streamingServices = ['netease'];
    private isStreamingSource(payload: any): payload is playback.source.streaming {
        return this.streamingServices.includes(payload.type);
    }
    private async getStreamingSource(
        input: playback.source.streaming
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
                        meta: {
                            title: song.name,
                            artists: song.ar.map(v => v.name).join(', '),
                            duration: song.dt
                        }
                    }
                }
            }
        } catch (e) {
            client.logger.error(e);
            return undefined;
        }
    }

    async playNetease(songId: number, meta?: playback.meta, forceSwitch: boolean = false) {
        const input: playback.source.netease = {
            type: 'netease',
            data: {
                songId
            }
        };
        const extra: playback.extra.netease = {
            type: 'netease',
            data: { songId, meta }
        }
        return this.playStreaming(input, meta, extra, forceSwitch);
    }
    async playStreaming(input: playback.source.streaming, meta?: playback.meta, extra?: playback.extra.streaming, forceSwitch: boolean = false) {
        let payload: queueItem = {
            source: input,
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
        input: playback.source.cache | Promise<playback.source.cache>,
        meta: playback.meta = {
            title: `Unknown file`,
            artists: 'Unknown',
            duration: 0
        },
        forceSwitch: boolean = false
    ) {
        let payload: queueItem = {
            source: input,
            meta: meta
        }
        this.pushPayload(payload, forceSwitch);
    }
    async playLocal(input: playback.source.local, forceSwitch: boolean = false) {
        const path = input.trim().replace(/^['"](.*)['"]$/, '$1').trim();
        if (fs.existsSync(path)) {
            if (fs.lstatSync(path).isDirectory()) {
                fs.readdirSync(path).forEach((file) => {
                    const fullPath = upath.join(path, file);
                    ffprobe(fullPath, async (err, data) => {
                        if (err) return;
                        if (data.streams.map(val => val.codec_type).includes('audio')) {
                            let payload: queueItem = {
                                source: fullPath,
                                meta: {
                                    title: `Local file: ${upath.parse(fullPath).base}`,
                                    artists: 'Unknown',
                                    duration: 0
                                }
                            }
                            this.pushPayload(payload, forceSwitch);
                        }
                    })
                })
            } else {
                let payload: queueItem = {
                    source: path,
                    meta: {
                        title: `Local file: ${upath.parse(path).base}`,
                        artists: 'Unknown',
                        duration: 0
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
    }

    getQueue() {
        return this.queue;
    }
    clearQueue() {
        this.queue = [];
    }

    paused: boolean = false;
    private queue: Array<queueItem> = [];

    setCycleMode(payload: 'repeat_one' | 'repeat' | 'no_repeat' = 'no_repeat') {
        this.cycleMode = payload;
    }
    getCycleMode() {
        return this.cycleMode;
    }

    private cycleMode: 'repeat_one' | 'repeat' | 'no_repeat' = 'no_repeat';
    nowPlaying?: queueItem;

    async next(): Promise<queueItem | undefined> {
        let upnext: queueItem | undefined;
        switch (this.cycleMode) {
            case 'no_repeat':
                upnext = this.queue.shift();
                break;
            case 'repeat_one':
                upnext = this.nowPlaying || this.queue.shift();
                break;
            case 'repeat':
                if (this.nowPlaying) this.queue.push(this.nowPlaying);
                upnext = this.queue.shift();
                break;
        }
        if (upnext) {
            this.nowPlaying = upnext;
            await this.playback(upnext);
            return upnext;
        }
    }

    private async preload() {
        if (this.queue[0]) {
            const prepared = await this.preparePayload(this.queue[0]);
            if (prepared) this.queue[0] = prepared;
        }
    }

    private async preparePayload(payload: queueItem): Promise<{
        source: playback.source.playable,
        meta: playback.meta,
        extra?: playback.extra
    } | undefined> {
        let source = payload.source, meta = payload.meta;
        if (source instanceof Promise) source = await source;
        if (this.isStreamingSource(source)) {
            const stream = (await this.getStreamingSource(source));
            if (!stream) return undefined;
            source = stream.source;
            meta = stream.meta;
        }
        return { source, meta, extra: payload.extra }
    }

    playbackStart?: number;

    async endPlayback() {
        delete this.currentMusic;
        delete this.playbackStart;
        this.previousStream = false;
        await delay(20);
        this.ffmpegInstance?.kill("SIGSTOP");
        this.fileP?.removeAllListeners();
        this.fileP?.destroy();
        this.fileP = new PassThrough();
    }

    async playback(payload: queueItem): Promise<void> {
        this.preload();
        this.playbackStart = Date.now();
        this.lastOperation = Date.now();
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

        var fileC: Readable;
        if (file instanceof Buffer) fileC = Readable.from(file);
        else if (file instanceof Readable) fileC = structuredClone(file);
        else fileC = fs.createReadStream(file);
        this.ffmpegInstance = ffmpeg()
            .input(fileC)
            .audioCodec('pcm_u8')
            .audioChannels(2)
            .audioFilter('volume=0.15')
            .audioFrequency(48000)
            .outputFormat('wav');
        this.ffmpegInstance
            .stream(this.fileP);
        var bfs: any[] = [];
        this.fileP.on('data', (chunk) => {
            bfs.push(chunk)
        })
        this.fileP.on('end', async () => {
            var now = 0;
            var cache = Buffer.concat(bfs);
            // var rate = 11025;
            // var rate = 965;
            var rate = 975;
            while (Date.now() - this.lastRead < 20);

            while (this.previousStream && now <= cache.length) {
                if (!this.paused) {
                    this.lastRead = Date.now();
                    const chunk = cache.subarray(now, now + rate);
                    if (this.previousStream && now <= cache.length) {
                        this.stream.push(chunk);
                    }
                    else {
                        return;
                    }
                    now += rate;
                }
                await delay(10);
            }
            if (this.previousStream) {
                await this.endPlayback();
                await this.next();
            }
        });
    }
}
