import { client } from "init/client";
import playlist from "./playback/lib/playlist";
import { Card, MessageType } from "kasumi.js";
import { ButtonControlPanel } from "./playback/lib/panel/index";
import leaveCommand from "menu/arisa/command/leave";
import { controller } from "./playback/lib/index";

interface UserLeaveVoiceChannelEventExtra {
    type: "exited_channel";
    body: {
        user_id: string;
        channel_id: string;
        exited_at: number;
    };
}
interface UserJoinVoiceChannelEventExtra {
    type: "joined_channel";
    body: {
        user_id: string;
        channel_id: string;
        joined_at: number;
    };
}
client.on("event.system", async (event) => {
    if (event.rawEvent.extra.type == "exited_channel") {
        // User leaves voice channel
        const extra: UserLeaveVoiceChannelEventExtra = event.rawEvent.extra;
        const streamer = controller.getChannelStreamer(extra.body.channel_id);
        if (streamer) {
            // has arisa
            if (extra.body.user_id != streamer.kasumi.me.userId) {
                streamer.audienceIds.delete(extra.body.user_id);
                if (streamer.INVITATION_AUTHOR_ID == extra.body.user_id) {
                    playlist.user.save(streamer, extra.body.user_id);
                }
                if (!streamer.audienceIds.size) {
                    // No audiences left
                    streamer.disconnect("语音频道内无用户");
                }
            }
        }
    } else if (event.rawEvent.extra.type == "joined_channel") {
        // User joins voice channel
        const extra: UserJoinVoiceChannelEventExtra = event.rawEvent.extra;
        const streamer = controller.getChannelStreamer(extra.body.channel_id);
        if (streamer) {
            if (extra.body.user_id != streamer.kasumi.me.userId)
                streamer.audienceIds.add(extra.body.user_id);
        }
    }
});
