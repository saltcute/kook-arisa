import { playback } from "menu/arisa/controller/music"

export interface payload {
    t: number,
    d: any
}
export interface streamer {
    name: string,
    identifyNum: streamer,
    avatar: string,
    startTimestamp: number,
    nowPlaying: playback.extra,
    queue: playback.extra[]
}