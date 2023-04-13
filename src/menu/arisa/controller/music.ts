import Kasumi from 'kasumi.js';
import Koice from 'koice';
import { Controller } from '.';
import { PassThrough, Readable } from 'stream';
import ffmpeg, { ffprobe } from 'fluent-ffmpeg';
import delay from 'delay';
import * as fs from 'fs';
import upath from 'upath';
import { client } from 'init/client';

type playbackLocalSouce = string;
type playbackFileSource = Buffer | Readable;
type playbackSource = playbackLocalSouce | playbackFileSource;

interface songMeta {
    title: string,
    artists: string,
    duration: number
}

type queue = {
    source: playbackSource | Promise<playbackSource>,
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
        if (this.previousStream && !forceSwitch) this.queue.push(payload);
        else this.playback(payload);
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
                            if (this.previousStream && !forceSwitch) {
                                this.queue.push(payload);
                            } else {
                                await this.playback(payload);
                            }
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
                if (this.previousStream && !forceSwitch) {
                    this.queue.push(payload);
                } else {
                    await this.playback(payload);
                }
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

    async next(): Promise<queue | undefined> {
        if (this.queue.length) {
            const upnext = this.queue.shift();
            if (upnext) {
                // console.log(`Up Next: ${upnext.meta.title}`);
                await this.playback(upnext);
                return upnext;
            }
        }
    }

    async playback(payload: queue): Promise<void> {
        this.lastOperation = Date.now();
        let file = payload.source;
        if (this.previousStream) {
            this.previousStream = false;
            await delay(20);
            this.ffmpegInstance?.kill("SIGSTOP");
            this.fileP?.removeAllListeners();
            this.fileP?.destroy();
            this.fileP = new PassThrough();
        }
        this.previousStream = true;
        this.currentMusicMeta = payload.meta;
        var fileC: Readable;
        if (file instanceof Promise) {
            try {
                file = await file;
            } catch (e) {
                client.logger.error(e);
                this.next();
                return;
            }
        }
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
