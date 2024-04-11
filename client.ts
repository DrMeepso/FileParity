import ws from 'ws';
import fs from 'fs';
import chokidar from 'chokidar';
import { clientConfig } from './types';

enum clientState {

    connecting,
    connected,
    awaitingFileStructure,
    ready

}

export function initClient(config: clientConfig) {

    // make sure the parity folder is valid
    if (!fs.existsSync(config.parityFolder)) {
        console.error('Parity folder does not exist');
        process.exit();
    }

    // connect to the server
    const wsClient = new ws(`ws://${config.serverIP}:${config.serverPort}`, {
        headers: {
            password: config.serverPassword
        }
    });

    // when the connection is established
    wsClient.on('open', () => {
        console.log('Connected to server');
    });

    // when the connection is closed
    wsClient.on('close', () => {
        console.log('Connection closed');
    });

    // when the connection receives a message
    wsClient.on('message', (message: string) => {
        console.log('Received message:', message);
    });

}