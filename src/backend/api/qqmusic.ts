import bodyParser from "body-parser";
import { Router } from "express";
import { client } from "init/client";
import qqmusic from "menu/arisa/command/qq/lib";
import { cache, forceReferer } from "./lib";

const router = Router();

router.use(bodyParser.json(), cache(60 * 15), forceReferer());

router.get('/search', cache(60 * 15), (req, res) => {
    const keyword = <string>req.query.keyword;
    if (keyword) {
        qqmusic.search(keyword, undefined, 20).then((re) => {
            res.send({
                code: 200,
                message: 'success',
                data: re
            });
        })
    } else {
        res.status(400).send({
            code: 400,
            message: 'no keyword was provided'
        })
    }
})

router.get('/lyric', cache(60 * 15), (req, res) => {
    const mid = <string>req.query.mid;
    if (mid) {
        qqmusic.getLyric(mid).then((re) => {
            res.send({
                code: 200,
                message: 'success',
                data: re
            });
        })
    } else {
        res.status(400).send({
            code: 400,
            message: 'no id was provided'
        })
    }
})
router.post('/updateCookie', (req, res) => {
    if (req.body.code != client.config.getSync("QQCookieCode")) {
        res.status(400).send({
            code: 400,
            message: 'wrong code'
        })
        return;
    }
    const cookie = req.body.cookie;
    qqmusic.updateCookie(cookie);
    res.send({
        code: 200,
        message: 'success'
    });
})

export default router;