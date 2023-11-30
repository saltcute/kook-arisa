const { spawn } = require('node:child_process');
spawn("npm", ["start"], { windowsHide: true, stdio: 'inherit' });
