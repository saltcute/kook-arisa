
export interface songDetail {
    /**
     * Song name
     */
    name: string,
    /**
     * Song ID
     */
    id: string,
    ar: {
        /**
         * Artist ID
         */
        id: number,
        /**
         * Artist name
         */
        name: string,
        tns: any[],
        alias: any[]
    }[],
    al: {
        /**
         * Album ID
         */
        id: number,
        /**
         * Album name
         */
        name: string,
        /**
         * Album cover
         */
        picUrl: string,
        tns: any[],
        pic_str: string,
        pic: number
    },
    /**
     * Song duration
     */
    dt: number,
    [key: string]: any
}