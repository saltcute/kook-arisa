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

interface playbackNeteaseSource {
    type: 'netease',
    data: {
        songId: number
    }
}
type playbackLocalSouce = string;
type playbackFileSource = Buffer | Readable;
type playbackPlayableSource = playbackLocalSouce | playbackFileSource;
type playbackStreamingSource = playbackNeteaseSource;
type playbackSource = playbackPlayableSource | playbackStreamingSource;

interface songMeta {
    title: string,
    artists: string,
    duration: number
}

type queue = {
    source: playbackSource | Promise<playbackSource>
    meta: songMeta
};
export class Streamer {
    readonly streamerToken: string;
    readonly targetChannelId: string;
    readonly targetGuildId: string;
    private controller: Controller;
    readonly kasumi: Kasumi;
    private readonly koice: Koice;

    constructor(token: string, guildId: string, channelId: string, controller: Controller) {
        this.streamerToken = structuredClone(token);
        this.targetChannelId = structuredClone(channelId);
        this.targetGuildId = structuredClone(guildId)
        this.controller = controller;
        this.kasumi = new Kasumi({
            type: 'websocket',
            token: this.streamerToken
        });
        this.koice = new Koice(this.streamerToken);
        this.lastOperation = Date.now();
        this.ensureUsage();
    }
    async connect() {
        this.koice.connectWebSocket(this.targetChannelId);
        await this.koice.startStream(this.stream);
        return this;
    }

    async disconnect(): Promise<boolean> {
        await this.koice.close();
        return this.controller.returnStreamer(this);
    }
    async playNetease(songId: number) {
        const input: playbackNeteaseSource = {
            type: 'netease',
            data: {
                songId
            }
        };
    }
    readonly streamingServices = ['netease'];
    private isStreamingSource(payload: any): payload is playbackStreamingSource {
        return this.streamingServices.includes(payload.type);
    }
    private async getStreamingSource(
        input: playbackStreamingSource
    ): Promise<{
        source: playbackPlayableSource,
        meta: songMeta
    }> {
        switch (input.type) {
            case 'netease': {
                const song = await netease.getSong(input.data.songId);
                const url = await netease.getSongUrl(input.data.songId);
                const buffer = (await axios.get(url, { responseType: 'arraybuffer' })).data
                return {
                    source: buffer,
                    meta: {
                        title: song.name,
                        artists: song.ar.map(v => v.name).join(', '),
                        duration: song.dt
                    }
                }
            }
        }
    }
    async playStreaming(input: playbackStreamingSource, forceSwitch: boolean = false) {
        let payload: queue = {
            source: input,
            meta: {
                title: `Unknown streaming service audio`,
                artists: 'Unknown',
                duration: -1
            }
        }
        this.queue.push(payload)
        if (!(this.previousStream && !forceSwitch)) this.next();
    }
    async playBuffer(
        input: playbackFileSource | Promise<playbackFileSource>,
        meta: songMeta = {
            title: `Unknown file`,
            artists: 'Unknown',
            duration: -1
        },
        forceSwitch: boolean = false
    ) {
        let payload: queue = {
            source: input,
            meta: meta
        }
        this.queue.push(payload)
        if (!(this.previousStream && !forceSwitch)) this.next();
    }
    async playLocal(input: playbackLocalSouce, forceSwitch: boolean = false) {
        const path = input.trim().replace(/^['"](.*)['"]$/, '$1').trim();
        if (fs.existsSync(path)) {
            if (fs.lstatSync(path).isDirectory()) {
                fs.readdirSync(path).forEach((file) => {
                    const fullPath = upath.join(path, file);
                    ffprobe(fullPath, async (err, data) => {
                        if (err) return;
                        if (data.streams.map(val => val.codec_type).includes('audio')) {
                            let payload: queue = {
                                source: fullPath,
                                meta: {
                                    title: `Local file: ${upath.parse(fullPath).base}`,
                                    artists: 'Unknown',
                                    duration: -1
                                }
                            }
                            this.queue.push(payload)
                            if (!(this.previousStream && !forceSwitch)) this.next();
                        }
                        // console.log(data.streams.map(val => val.codec_type));
                    })
                })
            } else {
                let payload: queue = {
                    source: path,
                    meta: {
                        title: `Local file: ${upath.parse(path).base}`,
                        artists: 'Unknown',
                        duration: -1
                    }
                }
                this.queue.push(payload)
                if (!(this.previousStream && !forceSwitch)) this.next();
            }
        }
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
    currentMusicMeta?: songMeta;
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
    private queue: Array<queue> = [];

    setCycleMode(payload: 'repeat_one' | 'repeat' | 'no_repeat') {
        this.cycleMode = payload;
    }

    private cycleMode: 'repeat_one' | 'repeat' | 'no_repeat' = 'no_repeat';
    private nowPlaying?: queue;

    async next(): Promise<queue | undefined> {
        let upnext: queue | undefined;
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
        this.queue[0] = await this.preparePayload(this.queue[0]);
    }

    private async preparePayload(payload: queue): Promise<{
        source: playbackPlayableSource,
        meta: songMeta
    }> {
        let source = payload.source, meta = payload.meta;
        if (source instanceof Promise) source = await source;
        if (this.isStreamingSource(source)) {
            const stream = (await this.getStreamingSource(source));
            source = stream.source;
            meta = stream.meta;
        }
        return { source, meta }
    }

    playbackStart?: number;

    async playback(payload: queue): Promise<void> {
        this.preload();
        this.playbackStart = Date.now();
        this.lastOperation = Date.now();
        if (this.previousStream) {
            this.previousStream = false;
            await delay(20);
            this.ffmpegInstance?.kill("SIGSTOP");
            this.fileP?.removeAllListeners();
            this.fileP?.destroy();
            this.fileP = new PassThrough();
        }
        this.previousStream = true;

        let prepared = await this.preparePayload(payload);
        let file = prepared.source;
        this.currentMusicMeta = prepared.meta;

        var fileC: Readable;
        if (file instanceof Buffer) fileC = Readable.from(file);
        else if (file instanceof Readable) fileC = structuredClone(file);
        else fileC = fs.createReadStream(file);
        this.ffmpegInstance = ffmpeg()
            .input(fileC)
            .audioCodec('pcm_u8')
            .audioChannels(2)
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
            var buffer = Buffer.concat(bfs);
            // var rate = 11025;
            var rate = 965;
            while (Date.now() - this.lastRead < 20);

            while (this.previousStream && now <= buffer.length) {
                if (!this.paused) {
                    this.lastRead = Date.now();
                    const chunk = buffer.subarray(now, now + rate);
                    if (this.previousStream && now <= buffer.length) {
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
                this.previousStream = false;
                await delay(20);
                this.ffmpegInstance?.kill("SIGSTOP");
                this.fileP?.removeAllListeners();
                this.fileP?.destroy();
                this.fileP = new PassThrough();
                await this.next();
            }
        });
    }
}
