import { isAxiosError } from "axios";
import { Router } from "express";
import { client } from "init/client";
import { forceReferer, getUserMe } from "./lib";

const router = Router();
router.use(forceReferer());

router.get("/isAdmin", async (req, res) => {
    const auth = req.query.auth?.toString();
    if (auth) {
        try {
            const me = (await getUserMe(auth));
            const user = await client.middlewares.AccessControl.global.group.getUser(me);
            res.send({
                code: 200,
                message: 'success',
                data: {
                    isAdmin: user.level >= 3000
                }
            })
        } catch (e) {
            if (isAxiosError(e)) {
                res.status(e.status || 400).send({
                    code: e.status || 400,
                    message: e.message,
                    data: e.response?.data
                })
            } else if (e instanceof Error) {
                res.status(500).send({
                    code: 500,
                    message: e.message
                })
            } else {
                res.status(500).send({
                    code: 500,
                    message: 'unknown'
                })
            }
        }
    } else {
        res.status(400).send({
            code: 400,
            message: 'no auth'
        })
    }
})

export default router;