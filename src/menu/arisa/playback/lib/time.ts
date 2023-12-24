export class Time {
    static readonly DAY = 86400;
    static readonly HOUR = 3600;
    static readonly MINUTE = 60;
    static readonly SECOND = 1;
    private static wholeDivision(a: number, b: number) {
        return Math.floor(a / b);
    }
    private static wholeModulo(a: number, b: number) {
        return Math.floor(a % b);
    }
    static timeDivision(time: number) {
        let d, h, m, s;
        d = this.wholeDivision(time, this.DAY);
        time = this.wholeModulo(time, this.DAY);
        h = this.wholeDivision(time, this.HOUR);
        time = this.wholeModulo(time, this.HOUR);
        m = this.wholeDivision(time, this.MINUTE);
        time = this.wholeModulo(time, this.MINUTE);
        s = this.wholeDivision(time, this.SECOND);
        time = this.wholeModulo(time, this.SECOND);
        return [d, h, m, s];
    }

    static timeToString(time: number) {
        let res = "";
        const [d, h, m, s] = this.timeDivision(time);
        if (d) res += `${d}天`;
        if (h) res += `${h}小时`;
        if (m) res += `${m}分钟`;
        if (s) res += `${s}秒`;
        return res;
    }

    static timeToShortString(time: number) {
        let res = "";
        const [d, h, m, s] = this.timeDivision(time);
        if (d) res += `${d}d,`;
        if (h) res += `${h.toString().padStart(2, "0")}:`;
        res += `${m.toString().padStart(2, "0")}:`;
        res += `${s.toString().padStart(2, "0")}`;
        return res;
    }
}