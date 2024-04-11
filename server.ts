import ws from 'ws';
import fs, { watch } from 'fs';
import { serverConfig, Folder, File, FileChangeType, FolderChangeType, Message } from './types';
import { DirWatcher } from './dirWatcher';
import { json } from 'stream/consumers';

export async function initServer(config: serverConfig) {

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
    wsServer.on('connection', (wsClient) => {
        console.log('Server:Net > Client connected, Waiting for login');

        // inform the client we are ready for them to login
        wsClient.send(JSON.stringify({
            type: 'login'
        } as Message))

        // when the client sends a message
        wsClient.on('message', (message: Buffer) => {
            console.log('Server:Net > Received message:', message.toString());
        });

        // when the client disconnects
        wsClient.on('close', () => {
            console.log('Client disconnected');
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

}

function logFS(folder: Folder)
{
    setTimeout(async () => {
        console.log(JSON.stringify(folder, null, 2));
    }, 100)
}