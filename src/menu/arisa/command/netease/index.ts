import { client } from "init/client";
import { BaseCommand, BaseSession, Card, CommandFunction } from "kasumi.js";
import menu from "menu/arisa";
import netease from './lib';
import { searchList } from "./lib/card";

class AppCommand extends BaseCommand {
    name = 'netease';
    description = '点歌网易云';
    func: CommandFunction<BaseSession, any> = async (session) => {
        switch (session.args[0]) {
            case 'search': {
                const keyword = session.args.slice(1).join(' ');
                if (keyword) {
                    session.reply(await searchList(keyword));
                } else {
                    session.reply("Please provide a keyword");
                }
                break;
            }
            default: {
                return session.reply("没有这个命令");
            }
        }
    }
}

const command = new AppCommand();
export default command;
menu.addCommand(command);