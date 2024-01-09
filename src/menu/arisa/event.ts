import { client } from "init/client";
import { controller } from ".";
import playlist from "./playback/lib/playlist";
import { Card, MessageType } from "kasumi.js";

interface userLeaveVoiceChannelEventExtra {
    type: 'exited_channel',
    body: {
        user_id: string,
        channel_id: string,
        exited_at: number
    }
}
interface userJoinVoiceChannelEventExtra {
    type: 'joined_channel',
    body: {
        user_id: string,
        channel_id: string,
        joined_at: number
    }
}
client.on('event.system', async (event) => {
    if (event.rawEvent.extra.type == 'exited_channel') { // User leaves voice channel
        const extra: userLeaveVoiceChannelEventExtra = event.rawEvent.extra;
        const streamer = controller.getChannelStreamer(extra.body.channel_id);
        if (streamer) { // has arisa
            if (extra.body.user_id == streamer.kasumi.me.userId) {
                if (streamer.panel) {
                    const promises = streamer.panel.panelChannelArray.map(id => client.API.message.create(MessageType.CardMessage, id, new Card().addTitle("Tips | 请注意").addText("请使用指令 `/arisa leave` 停止点歌，不要将机器人直接踢出语音频道")));
                    await Promise.all(promises);
                }
                streamer.disconnect("机器人被踢出语音频道");
            } else {
                streamer.audienceIds.delete(extra.body.user_id);
                if (streamer.INVITATION_AUTHOR_ID == extra.body.user_id) {
                    playlist.user.save(streamer, extra.body.user_id);
                }
                if (!streamer.audienceIds.size) { // No audiences left
                    streamer.disconnect("语音频道内无用户");
                }
            }
        }
    } else if (event.rawEvent.extra.type == 'joined_channel') { // User joins voice channel
        const extra: userJoinVoiceChannelEventExtra = event.rawEvent.extra;
        const streamer = controller.getChannelStreamer(extra.body.channel_id);
        if (streamer) {
            if (extra.body.user_id != streamer.kasumi.me.userId) streamer.audienceIds.add(extra.body.user_id);
        }
    }
});