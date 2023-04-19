import { client } from "init/client";
import { BaseSession, ButtonClickedEvent } from "kasumi.js";
import { data } from "menu/arisa/command/netease/lib/card/searchList";
import { getChannelStreamer } from "menu/arisa";

export default async function (event: ButtonClickedEvent, action: string[], data: data) {
    event.guildId = event.rawEvent.extra.body.guild_id;
    // console.log(event.rawEvent);
    let session = new BaseSession([], event, client), songId = data.songId;

    // console.log(songId, session.guildId, event.channelId, session.channelId);
    if (!session.guildId || !songId) return;
    getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
        session.sendTemp(`已将「${data.meta.title}」添加到播放列表！`);
        streamer.playNetease(songId)
    }).catch((e) => {
        switch (e.err) {
            case 'network_failure':
            case 'no_streamer':
            case 'no_joinedchannel':
                return session.sendTemp(e.msg);
            default:
                client.logger.error(e);
        }
    });
}