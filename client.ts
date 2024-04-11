import ws from 'ws';
import fs from 'fs';
import chokidar from 'chokidar';
import { LoginMessage, Message, clientConfig } from './types';

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
    const wsClient = new ws(`ws://${config.serverIP}:${config.serverPort}`);

    // when the connection is established
    wsClient.on('open', () => {
        console.log('Client:Net > Connected to server');
    });

    // when the connection is closed
    wsClient.on('close', () => {
        console.log('Client:Net > Connection closed');
    });

    // when the connection receives a message
    wsClient.on('message', (message: Buffer) => {
        let msg = JSON.parse(message.toString()) as Message
        console.log('Client:Net > Received message:', message.toString());

        
        switch (msg.type) {
            case 'login':
                wsClient.send(JSON.stringify({
                    type: 'login',
                    username: config.username,
                    password: config.password
                } as LoginMessage ));
                break;
            case 'loginSuccess':
                wsClient.send(JSON.stringify({
                    type: 'getFiles'
                }));
                break;
            case 'fileStructure':
                console.log('Client:Net > Received file structure');
                break;
        }

    });

}