import Kasumi from 'kasumi.js';
import Koice from 'koice';
import { Controller } from '.';
import { PassThrough, Readable } from 'stream';
import ffmpeg, { ffprobe } from 'fluent-ffmpeg';
import delay from 'delay';
import * as fs from 'fs';
import upath from 'upath';
import netease from '../command/netease/lib';

interface playbackNeteaseSource {
    type: 'netease',
    data: {
        songId: string
    }
}
type playbackLocalSouce = string;
type playbackFileSource = Buffer | Readable;
type playbackStreamingSource = playbackNeteaseSource;
type playbackSource = playbackLocalSouce | playbackFileSource | playbackStreamingSource;

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
    async playNetease(songId: string) {
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
    private async getStreamingSource(input: playbackStreamingSource) {
        switch (input.type) {
            case 'netease': {
                const song = netease.getSong(input.data.songId);
                break;
            }
        }
    }
    async playStreaming(input: playbackStreamingSource, forceSwitch: boolean = false) {
        if (this.previousStream && !forceSwitch) this.queue.push(input);
        else this.playback(input);
    }
    async playBuffer(input: playbackFileSource | Promise<playbackFileSource>, forceSwitch: boolean = false) {
        if (this.previousStream && !forceSwitch) this.queue.push(input);
        else this.playback(input);
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
                            if (this.previousStream && !forceSwitch) {
                                this.queue.push(fullPath);
                            } else {
                                await this.playback(fullPath);
                            }
                        }
                        // console.log(data.streams.map(val => val.codec_type));
                    })
                })
            } else {
                if (this.previousStream && !forceSwitch) {
                    this.queue.push(path);
                } else {
                    await this.playback(path);
                }
            }
        }
    }

    fileP = new PassThrough();
    ffmpegInstance: ffmpeg.FfmpegCommand | undefined;


    previousStream: boolean = false;
    lastRead: number = -1;

    readonly stream = new Readable({
        read(size) {
            return true;
        },
    })

    shuffle(array: any[]) {
        let currentIndex = array.length, randomIndex;

        // While there remain elements to shuffle.
        while (currentIndex != 0) {

            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }

        return array;
    }

    paused: boolean = false;
    queue: Array<playbackSource | Promise<playbackSource>> = [];

    async next(): Promise<void> {
        if (this.queue.length) {
            const upnext = this.queue.shift();
            if (upnext) await this.playback(upnext);
        }
    }

    async playback(file: playbackSource | Promise<playbackSource>): Promise<void> {
        console.log("pl a");
        if (this.previousStream) {
            this.previousStream = false;
            await delay(20);
            this.ffmpegInstance?.kill("SIGSTOP");
            this.fileP?.removeAllListeners();
            this.fileP?.destroy();
            this.fileP = new PassThrough();
        }
        this.previousStream = true;
        var fileC: Readable;
        if (this.isStreamingSource(file)) {
            return;
        }
        if (file instanceof Promise) file = await file;
        if (file instanceof Buffer) fileC = Readable.from(file);
        else if (file instanceof Readable) fileC = structuredClone(file);
        else fileC = fs.createReadStream(file);
        this.ffmpegInstance = ffmpeg()
            .input(fileC)
            .audioCodec('pcm_u8')
            .audioBitrate(128)
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
                await this.next();
                this.previousStream = false;
                await delay(20);
                this.ffmpegInstance?.kill("SIGSTOP");
                this.fileP?.removeAllListeners();
                this.fileP?.destroy();
                this.fileP = new PassThrough();
            }
        });
    }
}