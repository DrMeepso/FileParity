import { initClient } from "./client";
import { initServer } from "./server";
import fs from 'fs';

function readJSON(path: string) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}

// read the program arguments
const args = process.argv.slice(2);
// if -c is present read the next argument as the client config file
if (args.includes('-c')) {
    const clientConfig = readJSON(args[args.indexOf('-c') + 1]);
    initClient(clientConfig);
}

// if -s is present read the next argument as the server config file
if (args.includes('-s')) {
    const serverConfig = readJSON(args[args.indexOf('-s') + 1]);
    initServer(serverConfig);
}

// if no arguments are present, print the usage
if (!args.includes('-c') && !args.includes('-s')) {
    console.log('Usage: node index.ts -c clientConfig -s serverConfig');
}