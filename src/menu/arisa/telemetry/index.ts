import { controller } from "..";
import Status from "./status";
import { Collection, Db, MongoClient, WithId } from 'mongodb';
import { client } from "init/client";

import cache from 'memory-cache';
import { Session, TelemetryEntry } from "./type";


export class Telemetry {
    private static readonly MILLSECOND_PER_SECOND = 1000;
    private static readonly SECOND_PER_MINUTE = 60;
    private static readonly MINUTE_PER_HOUR = 60;
    private static readonly HOUR_PER_DAY = 24;
    private static readonly DAY_PER_WEEK = 7;
    private static readonly DAY_PER_30DAYS = 30;

    public static readonly MILLSECOND_PER_MINUTE = Telemetry.MILLSECOND_PER_SECOND * Telemetry.SECOND_PER_MINUTE;
    public static readonly MILLSECOND_PER_HOUR = Telemetry.MILLSECOND_PER_MINUTE * Telemetry.MINUTE_PER_HOUR;
    public static readonly MILLSECOND_PER_DAY = Telemetry.MILLSECOND_PER_HOUR * Telemetry.HOUR_PER_DAY;
    public static readonly MILLSECOND_PER_WEEK = Telemetry.MILLSECOND_PER_DAY * Telemetry.DAY_PER_WEEK;
    public static readonly MILLSECOND_PER_30DAYS = Telemetry.MILLSECOND_PER_DAY * Telemetry.DAY_PER_30DAYS;

    private timer?: NodeJS.Timeout;
    private readonly TELEMETRY_SAMPLE_INTERVAL = 5 * 1000;

    private mongodb: MongoClient;
    private db: Db;
    private recentCollection: Collection<TelemetryEntry>;
    private longtermCollection: Collection<TelemetryEntry>;
    constructor() {
        if (!client.config.hasSync("kasumi::config.mongoConnectionString")) {
            throw new Error("kasumi::config.mongoConnectionString does not exist in config");
        }
        this.mongodb = new MongoClient(client.config.getSync("kasumi::config.mongoConnectionString").toString());
        this.db = this.mongodb.db(client.config.getSync("kasumi::config.mongoDatabaseName"));
        this.recentCollection = this.db.collection("arisa.telemetry.recent");
        this.longtermCollection = this.db.collection("arisa.telemetry.longterm");
    }

    async getEntriesWithinTimeRange(start: number, end: number): Promise<WithId<TelemetryEntry>[]> {
        let collection: Collection<TelemetryEntry>,
            cacheKey: string;
        if (end - start >= Telemetry.MILLSECOND_PER_DAY) {
            collection = this.longtermCollection;
            cacheKey = `arisa::telemetry.longterm.from_${start}.to_${end}`;
        }
        else {
            collection = this.recentCollection;
            cacheKey = `arisa::telemetry.recent.from_${start}.to_${end}`;
        }
        const cached = cache.get(cacheKey);
        if (cached) return cached;
        else {
            const res = await collection.find({ sampleTimestamp: { $gte: start, $lte: end } }).toArray();
            cache.put(cacheKey, res, 30 * Telemetry.MILLSECOND_PER_MINUTE);
            return res;
        }
    }

    async getEntriesInLastXTime(ms = 60 * 1000) {
        return this.getEntriesWithinTimeRange(Date.now() - ms, Date.now());
    }

    async getUniqueUsers(): Promise<string[]> {
        return this.recentCollection.distinct("sessions.audiences.id");
    }
    async countUniqueUsers() {
        return (await this.getUniqueUsers()).length;
    }

    async getUniqueUsersInLastXTime(ms = 60 * 1000): Promise<string[]> {
        return this.recentCollection.distinct("sessions.audiences.id", {
            sampleTimestamp: {
                $gte: Date.now() - ms
            }
        })
    }
    async countUniqueUsersInLastXTime(ms = 60 * 1000) {
        return (await this.getUniqueUsersInLastXTime(ms)).length;
    }

    async getLastXEntries(limit = 50) {
        return this.recentCollection.find().sort({ sampleTimestamp: -1 }).limit(limit).toArray();
    }

    private lastLongtermInsert = 0;
    start() {
        client.logger.warn("Telemetry started");
        this.loop();
    }
    private async loop() {
        clearTimeout(this.timer);
        const entry = await this.task();
        await this.recentCollection.insertOne(entry)
        if (Date.now() - this.lastLongtermInsert >= 5 * Telemetry.MILLSECOND_PER_MINUTE) {
            this.longtermCollection.insertOne(entry);
        }
        this.timer = setTimeout(() => {
            this.loop();
        }, this.TELEMETRY_SAMPLE_INTERVAL);
    }
    private async task(): Promise<TelemetryEntry> {
        const sessions = this.getSessionFromController(),
            sessionCount = sessions.length,
            systemStatus = await Status.get(),
            systemStatusString = await Status.getPrettified("Arisa");
        return {
            sessionCount, sessions, systemStatus, systemStatusString,
            sampleTimestamp: Date.now()
        }
    }

    private getSessionFromController(): Session[] {
        const streamers = controller.activeStreamersArray;
        return streamers.map(streamer => {
            return {
                streamer: {
                    id: streamer.kasumi.me.userId,
                    username: streamer.kasumi.me.username,
                    identifyNum: streamer.kasumi.me.identifyNum,
                    avatar: streamer.kasumi.me.avatar
                },
                playlist: streamer.getQueue().map(item => {
                    return {
                        meta: item.meta,
                        extra: item.extra
                    }
                }),
                streamTargetChannelId: streamer.TARGET_CHANNEL_ID,
                streamTextChannelIds: streamer.panel?.panelChannelArray || [],
                audienceCount: streamer.audience.count(),
                audiences: streamer.audience.get()
            }
        });
    }
}
