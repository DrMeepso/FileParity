import ws from 'ws';
import fs, { watch } from 'fs';
import { serverConfig, Folder, File, FileChangeType, FolderChangeType } from './types';
import { DirWatcher } from './dirWatcher';

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
        console.log('Server:Net > Client connected');

        // when the client sends a message
        wsClient.on('message', (message: string) => {
            console.log('Server:Net > Received message:', message);
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