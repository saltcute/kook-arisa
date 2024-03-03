import { client } from 'init/client';
import playBilibili from './command/bilibili/play';
import importPlaylist from './command/netease/import';
import playNetease from './command/netease/play';
import searchNetease from './command/netease/search';
import searchQQ from './command/qq/search';

function matchRegex(regex: RegExp, content: string) {
    const res = content.match(regex);
    if (!res) return [];
    else return [...res];
}

client.on('message.text', async (event) => {
    const content = event.content;
    switch (true) {
        case /^(?:点歌|播放).+/.test(content): {
            switch (true) {
                case /.*https?.*music\.163\.com.*/.test(content): { // Netease Cloud Music
                    switch (true) {
                        case /song.*id=(\d+)/.test(content): {
                            const [url] = matchRegex(/(?:点歌|播放)(.+)/, content);
                            if (url) {
                                await playNetease.exec([url], event, client);
                            }
                            break;
                        }
                        case /playlist.*id=(\d+)/.test(content): {
                            const [url] = matchRegex(/(?:点歌|播放)(.+)/, content);
                            if (url) {
                                await importPlaylist.exec([url], event, client);
                            }
                            break;
                        }
                    }
                    break;
                }
                case /.*https?.*bilibili\.com.*video.*BV.*/.test(content): {
                    const [link] = matchRegex(/(?:点歌|播放)(.+)/, content);
                    playBilibili.exec([link], event, client);
                    break;
                }
                default: {
                    switch (true) {
                        case /(?:点歌|播放) ?[qQ][qQ].+/.test(content): {
                            const [keyword] = matchRegex(/(?:点歌|播放) ?[qQ][qQ](.+)/, content);
                            await searchQQ.exec([keyword], event, client);
                            break;
                        }
                        default: {
                            const [keyword] = matchRegex(/(?:点歌|播放)(?:wy)?(.+)/, content);
                            await searchNetease.exec([keyword], event, client);
                        }
                    }
                }
            }
        }
    }
})