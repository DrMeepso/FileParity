import ws from 'ws';
import fs from 'fs';
import { ErrorMesssage, FileStructureMessage, LoginMessage, Message, ServerLoginMessage, clientConfig } from './types';
import { DirWatcher } from './dirWatcher';
import crypto from 'crypto';

enum clientState {

    disconnected,
    connecting,
    connected,
    awaitingFileStructure,
    ready

}

export class Client {

    wsClient: ws;

    state: clientState = clientState.connecting;
    watcher: DirWatcher | undefined = undefined;
    config: clientConfig;

    serverPublicKey: string = ""

    constructor(config: clientConfig) {

        this.config = config;

        // make sure the parity folder is valid
        if (!fs.existsSync(config.parityFolder)) {
            console.error('Parity folder does not exist');
            process.exit();
        }

        // connect to the server
        this.wsClient = new ws(`ws://${config.serverIP}:${config.serverPort}`);

        // when the connection is established
        this.wsClient.on('open', () => {
            this.state = clientState.connected;
            console.log('Client:Net > Connected to server');
        });

        // when the connection is closed
        this.wsClient.on('close', () => {
            this.state = clientState.disconnected;
            console.log('Client:Net > Connection closed');
        });

        // when the connection receives a message
        this.wsClient.on('message', (message: Buffer) => {
            this.HandelMessage(message.toString());
        });

    }

    async HandelMessage(message: string) {

        let msg = JSON.parse(message) as Message
        //console.log('Client:Net > Received message:', message.toString());

        switch (msg.type) {
            case 'error':
                console.error('Client:Net > Received error:', (msg as ErrorMesssage).message);
                if ((msg as ErrorMesssage).fatial) {
                    console.log('Client:Net > Server sent a fatial error, closing connection');
                    this.wsClient.close();
                }
                break;

            case 'login':

                this.serverPublicKey = (msg as ServerLoginMessage).publicKey;

                this.send({
                    type: 'login',
                    username: this.config.username,
                    password: this.config.password
                } as LoginMessage);
                break;

            case 'loginSuccess':
                console.log('Client:Net > Logged in!');
                this.send({
                    type: 'getFiles'
                } as Message);
                break;

            case 'fileStructure':
                console.log('Client:Net > Received file structure');
                let FSMessage = msg as FileStructureMessage;

                let serverFiles = FSMessage.folder
                this.watcher = new DirWatcher(this.config.parityFolder);

                await (async () => {
                    return new Promise((resolve) => {
                        this.watcher?.on('ready', () => {
                            resolve(null);
                        })
                    });
                })()

                console.log('Client:FS > Comparing file structures');

                break;
        }
    }

    send(message: Message) {

        if (this.state == clientState.disconnected) {
            console.error('Client:Net > Cannot send message, not connected');
            return;
        }

        if(this.serverPublicKey != undefined) {

            let encryptedMessage = crypto.publicEncrypt(this.serverPublicKey, Buffer.from(JSON.stringify(message)));
            this.wsClient.send(encryptedMessage);

        } else {
            console.error('Client:Net > Cannot send message, server public key not set');
            return;
        }

    }

}

export function initClient(config: clientConfig) {

    return new Client(config);

}