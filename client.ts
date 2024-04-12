import ws from 'ws';
import fs from 'fs';
import { ErrorMesssage, FileStructureMessage, Folder, LoginMessage, Message, ServerLoginMessage, clientConfig } from './types';
import { DirWatcher } from './dirWatcher';
import crypto from 'crypto';
import { run } from 'node:test';

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

                this.addParents(serverFiles)

                this.compareFileStructures(serverFiles);

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

    async compareFileStructures(serverFiles: Folder) {

        console.log('Client:FS > Comparing file structures');

        let MissingFiles: string[] = [];
        let ModifiedFiles: string[] = [];
        let MissingFolders: string[] = [];

        const watcher = this.watcher

        // compare folder
        async function runFolder(cf: Folder)
        {
            for (let cFile of cf.files) {
                let path = await DirWatcher.getPath(cFile);
                console.log('Client:FS > Checking file:', path);
                let clientFile = await watcher?.getFile(path);
                if (clientFile == undefined) {
                    MissingFiles.push(path);
                    console.log('Client:FS > Missing file:', path);
                } else {
                    if (clientFile?.hash != cFile.hash) {
                        ModifiedFiles.push(path);
                    }
                }
            }

            for (let cFolder of cf.folders) {
                let path = await DirWatcher.getFoldePath(cFolder);
                console.log('Client:FS > Checking folder:', path);
                let clientFolder = await watcher?.getFolder(path);
                if (clientFolder == undefined) {
                    MissingFolders.push(path);
                    console.log('Client:FS > Missing folder:', path);
                }
                await runFolder(cFolder);
            }
        }

        await runFolder(serverFiles);

        console.log('Client:FS > Missing files:', MissingFiles);
        console.log('Client:FS > Modified files:', ModifiedFiles);
        console.log('Client:FS > Missing folders:', MissingFolders);

    }

    addParents(folder: Folder) {

        for (let file of folder.files) {
            file.parent = folder;
        }

        for (let subFolder of folder.folders) {
            subFolder.parent = folder;
            this.addParents(subFolder);
        }

    }

}

export function initClient(config: clientConfig) {

    return new Client(config);

}