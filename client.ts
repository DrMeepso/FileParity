import ws from 'ws';
import fs from 'fs';
import chokidar from 'chokidar';
import { ErrorMesssage, FileStructureMessage, LoginMessage, Message, clientConfig } from './types';

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
        HandelMessage(message.toString(), wsClient, config);
    });

}

function HandelMessage(message: string, wsClient: ws, config: clientConfig) {

    let msg = JSON.parse(message) as Message
    //console.log('Client:Net > Received message:', message.toString());

    switch (msg.type) {
        case 'error':
            console.error('Client:Net > Received error:', (msg as ErrorMesssage).message);
            if ((msg as ErrorMesssage).fatial) {
                console.log('Client:Net > Server sent a fatial error, closing connection');
            }
            break;
        case 'login':
            wsClient.send(JSON.stringify({
                type: 'login',
                username: config.username,
                password: config.password
            } as LoginMessage ));
            break;
        case 'loginSuccess':
            console.log('Client:Net > Logged in!');
            wsClient.send(JSON.stringify({
                type: 'getFiles'
            } as Message));
            break;
        case 'fileStructure':
            console.log('Client:Net > Received file structure');
            let FSMessage = msg as FileStructureMessage;

            let serverFiles = FSMessage.folder

            break;
    }



}