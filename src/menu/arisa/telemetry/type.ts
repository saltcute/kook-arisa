import { queueItem } from "../playback/type";
import { PrettifiedSystemStatus, SystemStatus } from "./status";

export interface KOOKUser {
    id: string,
    username: string,
    identifyNum: string,
    avatar: string
}

type PlaylistItem = Omit<queueItem, 'source' | 'endMark'>;

export interface Session {
    streamer: KOOKUser,
    playlist: PlaylistItem[]
    streamTargetChannelId: string,
    streamTextChannelIds: string[],
    audienceCount: number,
    audiences: KOOKUser[]
}

export interface TelemetryEntry {
    sessionCount: number,
    sessions: Session[],
    systemStatus: SystemStatus,
    systemStatusString: PrettifiedSystemStatus,
    sampleTimestamp: number
}