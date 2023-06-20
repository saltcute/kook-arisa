import { client } from "init/client";
import { controller } from ".";
import playlist from "./controller/playlist";

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
client.message.on('systemMessages', async (event) => {
    if (event.rawEvent.extra.type == 'exited_channel') { // User leaves voice channel
        const extra: userLeaveVoiceChannelEventExtra = event.rawEvent.extra;
        const streamer = controller.getChannelStreamer(extra.body.channel_id);
        if (streamer) { // has arisa
            streamer.audienceIds.delete(extra.body.user_id);
            if (streamer.INVITATION_AUTHOR_ID == extra.body.user_id) {
                playlist.user.save(streamer, extra.body.user_id);
            }
            if (!streamer.audienceIds.size) { // No audiences left
                streamer.disconnect();
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