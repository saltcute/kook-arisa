import { BaseMenu } from "kasumi.js";
import menu from "menu/arisa";
import search from "./search";

class AppMenu extends BaseMenu {
    name = 'qq';
    description = '点歌 QQ 音乐';
}

const qqMenu = new AppMenu(search);
export default qqMenu;
menu.addCommand(qqMenu);

import { client } from "init/client";
import { BaseSession, ButtonClickedEvent, Card } from "kasumi.js";
import { getChannelStreamer } from "menu/arisa";
import { LocalStreamer } from "menu/arisa/playback/local/player";
import { playback } from "menu/arisa/playback/type";

client.events.button.registerActivator('qq.queue.add', (event: ButtonClickedEvent, data: {
    songId: string,
    mediaId: string,
    meta: playback.meta
}) => {
    let session = new BaseSession([], event, client), songId = data.songId, mediaId = data.mediaId;

    if (!session.guildId || !songId || !mediaId) return;
    getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
        session.sendTemp(new Card().addText(`已将「${data.meta.title}」添加到播放列表！`));
        if (streamer instanceof LocalStreamer)
            streamer.playQQMusic(songId, mediaId, data.meta)
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
});