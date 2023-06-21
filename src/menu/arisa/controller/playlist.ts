import config from "config";
import { Streamer, playback, queueItem } from "./music";
import { MongoClient, ServerApiVersion } from "mongodb";

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
    private mongodb = new MongoClient(config.mongoDBURI, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    private database = this.mongodb.db("playlist");
    private colletion;
    constructor(name: string) {
        this.name = name;
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
                        await streamer.playNetease(item.data.songId, item.meta);
                        break;
                    }
                    case 'bilibili': {
                        await streamer.playBilibili(item.data.bvid, item.data.part, item.meta);
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