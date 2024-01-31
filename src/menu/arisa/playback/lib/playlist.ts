import { Streamer, playback } from "../type";
import { MongoClient, ServerApiVersion } from "mongodb";
import { client } from "init/client";
import { LocalStreamer } from "../local/player";

namespace Playlist {
    export interface collectionItem {
        _id: string,
        id: string,
        cycle: 'repeat' | 'repeat_one' | 'no_repeat',
        playlist: playback.extra[]
    }
}

class Playlist {
    name: string;
    private mongodb;
    private database;
    private colletion;
    constructor(name: string) {
        this.name = name;
        if (client.config.hasSync("kasumi::config.mongoConnectionString")) {
            this.mongodb = new MongoClient(client.config.getSync("kasumi::config.mongoConnectionString").toString(), {
                serverApi: {
                    version: ServerApiVersion.v1,
                    strict: true,
                    deprecationErrors: true,
                }
            });
        } else throw new Error("kasumi::config.mongoConnectionString does not exist in config");
        this.database = this.mongodb.db("playlist");
        this.colletion = this.database.collection<Playlist.collectionItem>(this.name);
    }
    private map: Map<string, Playlist.collectionItem> = new Map();
    async save(streamer: Streamer, id: string) {
        let queue = [], array: playback.extra[] = [];
        if (streamer.nowPlaying) queue.push(streamer.nowPlaying);
        queue = queue.concat(streamer.getQueue());
        for (const item of queue) {
            if (item.extra) array.push(item.extra);
        }
        this.map.set(id, {
            _id: id,
            id,
            cycle: streamer.getCycleMode(),
            playlist: array
        });
        await this.syncToDataBase(id);
    }
    async syncToDataBase(id: string) {
        let collectionItem = this.map.get(id);
        if (collectionItem) {
            await this.colletion.findOneAndUpdate({ _id: id }, { $set: collectionItem }, { upsert: true });
        }
    }
    async syncFromDataBase(id: string) {
        let collectionItem = await this.colletion.findOne<Playlist.collectionItem>({ _id: id });
        if (collectionItem) {
            this.map.set(id, collectionItem);
        }
    }
    async restore(streamer: Streamer, id: string) {
        await this.syncFromDataBase(id);
        let collectionItem = this.map.get(id);
        if (collectionItem) {
            streamer.setCycleMode(collectionItem.cycle);
            let array = collectionItem.playlist;
            for (const item of array) {
                switch (item.type) {
                    case 'netease': {
                        if (streamer instanceof LocalStreamer)
                            await streamer.playNetease(item.data.songId, item.meta);
                        break;
                    }
                    case 'bilibili': {
                        if (streamer instanceof LocalStreamer)
                            await streamer.playBilibili(item.data.bvid, item.data.part, item.meta);
                        break;
                    }
                    case 'qqmusic': {
                        if (streamer instanceof LocalStreamer)
                            await streamer.playQQMusic(item.data.songMId, item.data.mediaId, item.meta);
                        break;
                    }
                }
            }
        }
    }
}

namespace playlist {
    export const user = new Playlist('user');
    export const channel = new Playlist('channel');
}
export default playlist;