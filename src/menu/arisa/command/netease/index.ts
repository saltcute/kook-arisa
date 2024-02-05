import { BaseMenu } from "kasumi.js";
import menu from "menu/arisa";
import search from "./search";

import { client } from "init/client";
import { BaseSession, ButtonClickedEvent, Card } from "kasumi.js";
import { data } from "menu/arisa/command/netease/lib/card/searchList";
import { getChannelStreamer } from "menu/arisa";
import { LocalStreamer } from "menu/arisa/playback/local/player";
import importPlaylist from "./import";

class AppMenu extends BaseMenu {
    name = 'netease';
    description = '点歌网易云';
}

const neteaseMenu = new AppMenu(search, importPlaylist);
export default neteaseMenu;
menu.addCommand(neteaseMenu);

client.events.button.registerActivator('netease.queue.add', (event: ButtonClickedEvent, data: data) => {
    let session = new BaseSession([], event, client), songId = data.songId;

    if (!session.guildId || !songId) return;
    getChannelStreamer(session.guildId, session.authorId).then(async (streamer) => {
        session.sendTemp(new Card().addText(`已将「${data.meta.title}」添加到播放列表！`));
        if (streamer instanceof LocalStreamer)
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
});