import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import he from "he";
const XML = new XMLParser();

enum LyricsType {
    NoSync = 1,
    LineSync = 2,
    WordSync = 3,
}

interface IWordSyncWord {
    /**
     * Start timediff in ms
     */
    starttime: number;
    /**
     * Charater count of the word
     */
    chanum: number;
    /**
     * End timediff in ms
     */
    endtime: number;
    /**
     * String of the whole word
     */
    wordstring: string;
}
interface IWordSyncLine {
    /**
     * String of the whole line
     */
    linestring: string;
    /**
     * Word count of the line
     */
    wordnum: number;
    /**
     * Array of words
     */
    word: IWordSyncWord | IWordSyncWord[];
}
export interface IWordSyncLyric {
    /**
     * Line count of the lyric
     */
    linenum: number;
    /**
     * Array of lines
     */
    line: IWordSyncLine | IWordSyncLine[];
}

export class Puchiriri {
    private static readonly MILLISECOND = 1;
    private static readonly SECOND = 1000 * this.MILLISECOND;
    private static readonly MINUTE = 60 * this.SECOND;
    private static wholeDivision(a: number, b: number) {
        return Math.floor(a / b);
    }
    private static wholeModulo(a: number, b: number) {
        return Math.floor(a % b);
    }
    private static timeDivision(time: number) {
        let m, s, ms;
        m = this.wholeDivision(time, this.MINUTE);
        time = this.wholeModulo(time, this.MINUTE);
        s = this.wholeDivision(time, this.SECOND);
        time = this.wholeModulo(time, this.SECOND);
        ms = this.wholeDivision(time, this.MILLISECOND);
        time = this.wholeModulo(time, this.MILLISECOND);
        return [m, s, ms];
    }
    private static timeToShortString(time: number) {
        if (time < 0) return "[00:00.000]";
        const [m, s, ms] = this.timeDivision(time);
        return `[${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}]`;
    }

    public static async getWordSyncLyric({
        name,
        artist,
        album,
        duration,
    }: {
        name?: string;
        artist?: string;
        album?: string;
        /**
         * Length of the song in milliseconds
         */
        duration?: number;
    }) {
        try {
            if (duration && duration < 0) duration = 0;
            const res = XML.parse(
                (
                    await axios.post(
                        "https://p1.petitlyrics.com/api/GetPetitLyricsData.php",
                        {
                            key_title: name,
                            key_album: album,
                            key_artist: artist,
                            lyricsType: LyricsType.WordSync,
                            key_duration: duration,

                            terminalType: 4,
                            alter_text: "",
                            userId: "7D271F93-00F9-4D92-A608-1BB2780B48A2",
                            clientAppId: "p1232089",
                            logFlag: 0,
                        },
                        {
                            headers: {
                                "Content-Type":
                                    "application/x-www-form-urlencoded",
                                "User-Agent":
                                    "PetitLyrics/2.8.2.20230511.0 CFNetwork/1410.0.3 Darwin/22.6.0",
                            },
                        }
                    )
                ).data
            ).response;
            const lyric = Buffer.from(
                res.songs.song.lyricsData,
                "base64"
            ).toString("utf-8");
            const parsed: {
                wsy?: IWordSyncLyric;
            } = XML.parse(lyric);
            if (parsed.wsy) return parsed.wsy;
            else return lyric;
        } catch (e) {
            return "";
        }
    }

    public static async getNoSyncLyric({
        name,
        artist,
        album,
        duration,
    }: {
        name: string;
        artist: string;
        album: string;
        /**
         * Length of the song in milliseconds
         */
        duration: number;
    }) {
        const lyric = Buffer.from(
            XML.parse(
                (
                    await axios.post(
                        "https://p1.petitlyrics.com/api/GetPetitLyricsData.php",
                        {
                            key_title: name,
                            key_album: album,
                            key_artist: artist,
                            lyricsType: LyricsType.NoSync,
                            key_duration: duration,

                            terminalType: 4,
                            alter_text: "",
                            userId: "7D271F93-00F9-4D92-A608-1BB2780B48A2",
                            clientAppId: "p1232089",
                            logFlag: 0,
                        },
                        {
                            headers: {
                                "Content-Type":
                                    "application/x-www-form-urlencoded",
                                "User-Agent":
                                    "PetitLyrics/2.8.2.20230511.0 CFNetwork/1410.0.3 Darwin/22.6.0",
                            },
                        }
                    )
                ).data
            ).response.songs.song.lyricsData,
            "base64"
        ).toString("utf-8");
        return lyric;
    }
    public static async wordSyncLyricToLRC(lyric: IWordSyncLyric) {
        let lrc = "";
        const lines = lyric.line instanceof Array ? lyric.line : [lyric.line];
        for (const line of lines) {
            if (line.linestring == "") {
                lrc += "\n";
                continue;
            }
            const words = line.word instanceof Array ? line.word : [line.word];
            const firstWord = words.sort(
                (a, b) => a.starttime - b.starttime
            )[0];
            lrc += `${this.timeToShortString(firstWord.starttime)}${he.decode(line.linestring)}\n`;
        }
        return lrc;
    }
    public static async wordSyncLyricToText(lyric: IWordSyncLyric) {
        const lines = lyric.line instanceof Array ? lyric.line : [lyric.line];
        return lines.map((v) => v.linestring).join("\n");
    }
}
