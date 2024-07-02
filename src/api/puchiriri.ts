import { Router } from "express";
import { cache } from "./lib/index";
import { Puchiriri } from "./lib/puchiriri";

const router = Router();

router.use(cache(24 * 60 * 60 * 1000));

router.get("/lrc", async (req, res) => {
    let name: string | undefined = <string>req.query.name;
    let artist: string | undefined = <string>req.query.artist;
    let album: string | undefined = <string>req.query.album;
    let duration: number | undefined = parseInt(<string>req.query.duration);
    if (isNaN(duration)) duration = undefined;
    const lyric = await Puchiriri.getWordSyncLyric({
        name,
        artist,
        album,
        duration,
    });
    if (typeof lyric === "string") {
        return res.status(404).send({
            code: 404,
            message: "no word sync lyrics found",
        });
    }
    return res.send({
        code: 200,
        message: "success",
        data: await Puchiriri.wordSyncLyricToLRC(lyric),
    });
});

export default router;
