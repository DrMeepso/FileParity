import ws from 'ws';
import fs, { watch } from 'fs';
import { serverConfig, Folder, File, FileChangeType, FolderChangeType, Message, LoginMessage, ErrorMesssage, FileStructureMessage } from './types';
import { DirWatcher } from './dirWatcher';

export async function initServer(config: serverConfig, auth: (username: string, password: string) => boolean) {

    // make sure the parity folder is valid
    if (!fs.existsSync(config.parityFolder)) {
        console.error('Server:FS > Parity folder does not exist');
        process.exit();
    }

    console.log('Server:FS > Parity folder exists!');

    let watcher = new DirWatcher(config.parityFolder);

    // create the server
    const wsServer = new ws.Server({
        port: config.serverPort
    });

    // when a client connects
    wsServer.on('connection', async (wsClient) => {
        console.log('Server:Net > Client connected, Waiting for login');

        // inform the client we are ready for them to login
        wsClient.send(JSON.stringify({
            type: 'login'
        } as Message))

        // when the client sends a message
        wsClient.on('message', async (message: Buffer) => {
            let msg = JSON.parse(message.toString()) as Message;

            switch (msg.type) {

                case 'login':
                    let loginMSG = msg as LoginMessage;
                    if (auth(loginMSG.username, loginMSG.password)) {
                        console.log('Server:Net > Client logged in');
                        wsClient.send(JSON.stringify({
                            type: 'loginSuccess'
                        } as Message));
                    } else {
                        console.log('Server:Net > Client login failed');

                        wsClient.send(JSON.stringify({
                            type: 'error',
                            message: 'Login failed, Credentials incorrect',
                            fatial: true
                        } as ErrorMesssage))

                        wsClient.close();
                    }
                    break;

                case 'getFiles':
                    console.log('Server:Net > Sending file structure');
                    
                    if (!watcher.ready) {

                        console.log('Server:FS > Defering - Waiting for watcher to be ready');

                        await new Promise((resolve) => {
                            watcher.on('ready', () => {
                                resolve(null);
                            })
                        });
                    }

                    wsClient.send(JSON.stringify({
                        type: 'fileStructure',
                        folder: await watcher.getFileStructure()
                    } as FileStructureMessage));
                    break;

            }

        });

        // when the client disconnects
        wsClient.on('close', () => {
            console.log('Server:Net > Client disconnected');
        });

    });

    // when the server starts
    wsServer.on('listening', () => {
        console.log('Server:Net > Server started');
    });

    // when the server stops
    wsServer.on('close', () => {
        console.log('Server:Net > Server stopped');
    });

