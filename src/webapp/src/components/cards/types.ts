import { playback } from "menu/arisa/playback/type"

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

interface Payload {
    t: number,
    d: any
}

export interface ClientPayload extends Payload {
    t: ClientEvents;
}
export interface ServerPayload extends Payload {
    t: ServerEvents;
}

export enum ClientEvents {
    GET_USER_ID,
    PLAYBACK_PAUSE_RESUME,
    PLAYBACK_NEXT_PREVIOUS,
    PLAYBACK_MOVE_QUEUE,
    PLAYBACK_SHUFFLE_QUEUE,
    PLAYBACK_CYCLE_MODE,
    PLAYBACK_PLAY_SONG,
    PLAYBACK_JUMP_TO_PERCENT,
    SELECT_GUILD,
    CLIENT_PING
}
export enum ServerEvents {
    STREAMER_DATA,
    SERVER_PONG
}