import { client } from "init/client";
import { BaseSession, ButtonClickedEvent, Card } from "kasumi.js";
import { data } from "menu/arisa/command/netease/lib/card/searchList";
import { getChannelStreamer } from "menu/arisa";

export default async function (event: ButtonClickedEvent, action: string[], data: data) {
    let session = new BaseSession([], event, client), songId = data.songId;

    if (!session.guildId || !songId) return;
    getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
        session.sendTemp(new Card().addText(`已将「${data.meta.title}」添加到播放列表！`));
        streamer.playNetease(songId, data.meta)
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