import config from "config";
import axios, { isAxiosError } from "axios";
import webui from "config/webui";
import { Router } from "express";

const router = Router();

router.post('/me', (req, res) => {
    const auth = req.body.auth
    if (auth) {
        axios({
            url: 'https://www.kookapp.cn/api/v3/user/me',
            method: 'GET',
            headers: {
                Authorization: auth
            }
        }).then(({ data }) => {
            res.send(data)
        }).catch((e) => {
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
        })
    } else {
        res.status(400).send({
            code: 400,
            message: 'no auth'
        })
    }
})

router.get('/login', (req, res) => {
    const code = req.query.code;
    if (code) {
        axios({
            url: 'https://www.kookapp.cn/api/oauth2/token',
            method: 'POST',
            data: {
                grant_type: 'authorization_code',
                client_id: webui.kookClientID,
                client_secret: config.kookClientSecret,
                code,
                redirect_uri: webui.dashboardUrl
            }
        }).then(({ data }) => {
            res.send({
                code: 200,
                message: 'success',
                data
            })
        }).catch((e) => {
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
        })
    } else {
        res.status(400).send({
            code: 400,
            message: 'no code'
        })
    }
})

export default router;