import { playback } from "menu/arisa/playback/type"

export interface payload {
    t: number,
    d: any
}
export interface streamerDetail {
    name: string,
    identifyNum: string,
    avatar: string,
    trackPlayedTime: number,
    trackTotalDuration: number,
    isPaused: boolean,
    nowPlaying?: playback.extra,
    queue: playback.extra[],
    cycleMode: 'repeat_one' | 'repeat' | 'no_repeat'
}