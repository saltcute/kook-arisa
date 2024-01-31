const qq = require("@saltcute/qq-music-api");

(async () => {
    const cookie = "login_type=1; wxunionid=; tmeLoginType=2; euin=owE57en5NKE57n**; wxrefresh_token=; RK=if3UrRBYQ8; _qpsvr_localtk=0.6664378679316039; music_ignore_pskey=202306271436Hn@vBj; Qs_lvt_323937=1706485524; psrf_qqrefresh_token=8BD5BC69DB7EE1B718337E89177C1459; uin=2914019914; pgv_pvid=6216987190; pgv_info=ssid=s3689474452; Qs_pv_323937=189087846378795840; fqm_sessionid=7334b025-1d34-4676-8619-06fe71b9be24; ptui_loginuin=971327682@qq.com; _clck=m46ff|1|fi8|0; eas_sid=9146p884C3r5L4V1H6o1e2F1c0; fqm_pvqid=2dbde737-18ac-46db-aace-46ccc5887760; psrf_access_token_expiresAt=1714433342; psrf_musickey_createtime=1706657342; psrf_qqaccess_token=FC29A1EBD8B5E2EB2BC0C896E24B9591; psrf_qqopenid=20A907D9CE6C9AABAF5F1A6CAF0FDDD2; psrf_qqunionid=3EB5689ECB11A46CB2D4885DC37B55A5; ptcz=b78221a764215a7f335abe5a22aef5c06b03e630bec3eaceca429da40ee8f58b; qm_keyst=Q_H_L_5yHBm03gijzLvwkhW0dMD0YR7oQaucElNP-dB5_7T91VPI-eK0ytaBA; qqmusic_key=Q_H_L_5yHBm03gijzLvwkhW0dMD0YR7oQaucElNP-dB5_7T91VPI-eK0ytaBA; ts_last=y.qq.com/; ts_refer=jsososo.github.io/; ts_uid=9411380150; wxopenid=";

    qq.setCookie(cookie);

    const res = await qq.api("song", { songmid: "001RjgI84GJVQT" });
    console.dir(res, { depth: null });
})()