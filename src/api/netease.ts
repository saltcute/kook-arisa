import { Router } from "express";
import { cache, forceReferer } from "./lib/index";

import netease from "menu/arisa/command/netease/lib";
const router = Router();

router.use(cache(60 * 15), forceReferer());

router.get("/search", (req, res) => {
    const keyword = <string>req.query.keyword;
    if (keyword) {
        netease.cloudsearch(keyword, undefined, 20).then((re) => {
            res.send({
                code: 200,
                message: "success",
                data: re,
            });
        });
    } else {
        res.status(400).send({
            code: 400,
            message: "no keyword was provided",
        });
    }
});

router.get("/songs", (req, res) => {
    const ids = <string>req.query.ids;
    if (ids) {
        netease.getSongMultiple(ids).then((re) => {
            res.send({
                code: 200,
                message: "success",
                data: re,
            });
        });
    } else {
        res.status(400).send({
            code: 400,
            message: "no id was provided",
        });
    }
});

router.get("/lyric", (req, res) => {
    const id = <string>req.query.id;
    if (id) {
        netease.getLyric(parseInt(id)).then((re) => {
            res.send({
                code: 200,
                message: "success",
                data: re,
            });
        });
    } else {
        res.status(400).send({
            code: 400,
            message: "no id was provided",
        });
    }
});

export default router;
