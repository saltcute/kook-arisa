import Kasumi from 'kasumi.js';
import upath from 'upath';
import CustomKasumi from './type';


export const client: CustomKasumi = new Kasumi() as CustomKasumi;

client.config.loadConfigFile(upath.join(__dirname, '..', 'config', 'config.json'));