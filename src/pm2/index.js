const upath = require('upath');
const { spawn } = require('node:child_process');
const process = require('node:process');
const pkg = require(upath.join(__dirname, '..', '..', 'package.json'));

const pro = spawn("pm2", [
    'start',
    upath.join(__dirname, 'pm2-windows.js'),
    `--name=${pkg.name}`,
    ...process.argv.splice(2)
], { windowsHide: true, stdio: 'inherit' });