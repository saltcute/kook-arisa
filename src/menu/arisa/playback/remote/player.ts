import { Controller } from '../type';
import { Streamer, playback, queueItem } from '../type';

const biliAPI = require('bili-api');


export class RemoteStreamer extends Streamer {

    constructor(token: string, guildId: string, channelId: string, authorId: string, controller: Controller) {
        super(token, guildId, channelId, authorId, controller);
    }

    doConnect(): Promise<this> {
        throw new Error('Method not implemented.');
    }
    doDisconnect(message?: string | null): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    streamingServices = ['netease', 'bilibili'];
    playStreaming(meta: playback.meta, extra: playback.extra.streaming, forceSwitch: boolean): Promise<void> {
        throw new Error('Method not implemented.');
    }
    playBuffer(input: playback.source.cache, meta: playback.meta, forceSwitch: boolean): Promise<void> {
        throw new Error('Method not implemented.');
    }
    playLocal(input: playback.extra.local, forceSwitch: boolean): Promise<void> {
        throw new Error('Method not implemented.');
    }
    shuffle(): void {
        throw new Error('Method not implemented.');
    }
    getQueue(): queueItem[] {
        throw new Error('Method not implemented.');
    }
    clearQueue(): void {
        throw new Error('Method not implemented.');
    }
    audienceIds: Set<string> = new Set();
    get pausedTime(): number {
        throw new Error('Method not implemented.');
    }
    get duration(): number {
        throw new Error('Method not implemented.');
    }
    get playedTime(): number {
        throw new Error('Method not implemented.');
    }
    isPaused(): boolean {
        throw new Error('Method not implemented.');
    }
    doPause(): void {
        throw new Error('Method not implemented.');
    }
    doResume(): void {
        throw new Error('Method not implemented.');
    }
    queueMoveUp(index: number): void {
        throw new Error('Method not implemented.');
    }
    queueMoveDown(index: number): void {
        throw new Error('Method not implemented.');
    }
    queueDelete(index: number): void {
        throw new Error('Method not implemented.');
    }
    setCycleMode(payload: 'repeat' | 'repeat_one' | 'no_repeat'): void {
        throw new Error('Method not implemented.');
    }
    getCycleMode(): 'repeat' | 'repeat_one' | 'no_repeat' {
        throw new Error('Method not implemented.');
    }
    previous(): Promise<queueItem | undefined> {
        throw new Error('Method not implemented.');
    }
    next(): Promise<queueItem | undefined> {
        throw new Error('Method not implemented.');
    }
    endPlayback(): Promise<void> {
        throw new Error('Method not implemented.');
    }
    jumpToPercentage(percent: number): void {
        throw new Error('Method not implemented.');
    }
    doPlayback(payload: queueItem): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
