import { client } from "init/client";
import { controller } from ".";
import playlist from "./controller/playlist";

interface userLeaveVoiceChannelEvent {
    type: 'exited_channel',
    body: {
        user_id: string,
        channel_id: string,
        exited_at: number
    }
}
client.message.on('systemMessages', async (event) => {
    if (event.rawEvent.extra.type == 'exited_channel') { // User leaves voice channel
        const extra: userLeaveVoiceChannelEvent = event.rawEvent.extra;
        const { err, data: list } = await client.API.channel.voiceChannelUserList(extra.body.channel_id);
        if (err) {
            return client.logger.error(err);
        }
        const streamer = controller.getChannelStreamer(extra.body.channel_id);
        if (streamer) { // has arisa
            if (list.length == 1) { // Only one user left in channel. Probably Arisa.
                streamer.disconnect();
            }
            if (streamer.INVITATION_AUTHOR_ID == extra.body.user_id) {
                playlist.user.save(streamer, extra.body.user_id);
            }
        }
    }
});