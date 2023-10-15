import Kasumi from "kasumi.js";
import upath from 'upath';

export const client = new Kasumi();

client.config.loadConfigFile(upath.join(__dirname, '..', 'config', 'config.json'));