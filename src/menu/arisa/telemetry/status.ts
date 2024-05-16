import platform from 'platform';
import os from 'node:os';
import { readFileSync } from 'fs'

export interface SystemStatus {
    runtime: string,
    os: string,
    hostname: string,
    cpuName: string,
    cpuCores: number,
    cpuSpeed: number,
    cpuLoad: number,
    memoryTotal: number,
    memoryFree: number,
}
export interface PrettifiedSystemStatus {
    name: string,
    hostname: string,
    runtime: string,
    load: string,
    mem: string,
    cpu: string
}

class Status {
    static async getAverageUsage(interval: number) {
        let timesBefore = os.cpus().map(c => c.times);
        await (await import('delay')).default(interval);
        let timesAfter = os.cpus().map(c => c.times);
        let timeDeltas = timesAfter.map((t, i) => ({
            user: t.user - timesBefore[i].user,
            sys: t.sys - timesBefore[i].sys,
            idle: t.idle - timesBefore[i].idle
        }));

        timesBefore = timesAfter;

        return timeDeltas
            .map(times => 1 - times.idle / (times.user + times.sys + times.idle))
            .reduce((l1, l2) => l1 + l2) / timeDeltas.length;
    }


    static getLinuxDistro() {
        try {
            const data = readFileSync('/etc/os-release', 'utf8');
            const lines = data.split('\n')
            const releaseDetails: { [key: string]: string } = {}
            lines.forEach((line) => {
                const words = line.split('=')
                if (words[0] && words[1]) {
                    releaseDetails[words[0].trim().toLowerCase()] = words[1].trim().split('"')[1];
                }
            })
            return releaseDetails.pretty_name;
        } catch (e) { return "" }
    }


    static async get(): Promise<SystemStatus> {
        const systemStatus: SystemStatus = {
            runtime: '',
            os: '',
            hostname: '',
            cpuName: '',
            cpuCores: 0,
            cpuSpeed: 0,
            cpuLoad: 0,
            memoryTotal: 0,
            memoryFree: 0,
        }
        systemStatus.runtime = `${platform.name} v${platform.version}`;
        switch (os.platform()) {
            case 'darwin':
                const macOSVersion = (await import('macos-release')).default(os.release());
                systemStatus.os = `macOS ${macOSVersion?.name} ${macOSVersion?.version}`;
                break;
            case 'win32':
                systemStatus.os = `Windows ${os.release()}`;
                break;
            case 'linux':
                systemStatus.os = this.getLinuxDistro();
                break;
            default:
                systemStatus.os = `${os.platform()} ${os.release()}`
        }
        systemStatus.hostname = os.hostname();
        systemStatus.cpuName = os.cpus()[0].model;
        systemStatus.cpuCores = os.cpus().length;
        systemStatus.cpuSpeed = os.cpus()[0].speed;
        systemStatus.cpuLoad = os.loadavg()[0] || await this.getAverageUsage(100);
        systemStatus.memoryTotal = (os.totalmem() / 1024 / 1024 / 1024);
        systemStatus.memoryFree = (os.freemem() / 1024 / 1024 / 1024);
        return systemStatus;
    }
    static async getPrettified(appName: string = "Kasumi.js"): Promise<PrettifiedSystemStatus> {
        const systemStatus = await this.get();
        return {
            name: appName,
            hostname: systemStatus.hostname,
            runtime: `${systemStatus.runtime}/${systemStatus.os}`,
            load: `${systemStatus.cpuLoad.toFixed(2)}`,
            mem: `${((1 - (systemStatus.memoryFree / systemStatus.memoryTotal)) * 100).toFixed(2)}% ${(systemStatus.memoryTotal - systemStatus.memoryFree).toFixed(2)} GB/${systemStatus.memoryTotal.toFixed(2)} GB`,
            cpu: `${systemStatus.cpuCores}x ${systemStatus.cpuName} @${systemStatus.cpuSpeed} MHz`
        };
    }
}

export default Status;