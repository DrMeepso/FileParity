import ws from 'ws';
import fs, { watch } from 'fs';
import { serverConfig, Folder, File, FileChangeType, FolderChangeType, Message, LoginMessage, ErrorMesssage, FileStructureMessage, ServerLoginMessage } from './types';
import { DirWatcher } from './dirWatcher';
import crypto from 'crypto';

class ServerClient {

    RSAPublicKey: string;
    RSAPrivateKey: string;

    Username: string = "Unkown"

    WSClient: ws;

    hasLoggedIn: boolean = false;

    constructor(wsClient: ws, username: string = '') {

        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048
        });

        this.RSAPublicKey = publicKey.export({
            type: 'spki',
            format: 'pem'
        }).toString();

        this.RSAPrivateKey = privateKey.export({
            type: 'pkcs8',
            format: 'pem'
        }).toString();

        this.WSClient = wsClient;
        this.Username = username;

        console.log(`Server:${this.Username}:RSA > Generated RSA key pair`);

    }

    send(msg: Message) {

        // encrypt the message
        let encrypted = crypto.privateEncrypt(this.RSAPrivateKey, Buffer.from(JSON.stringify(msg)));

        this.WSClient.send(encrypted);
    }

    decrypt(msg: Buffer) {
        try {
            return JSON.parse(crypto.privateDecrypt(this.RSAPrivateKey, msg).toString());
        } catch (e) {
            console.error('Server:Net > Failed to decrypt message');
            this.send({
                type: 'error',
                message: 'Failed to decrypt message, are you sure you are using the correct key?',
                fatial: true
            } as ErrorMesssage);
            return null;
        }   
    }

}

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

        const thisClient = new ServerClient(wsClient, 'Unkown');

        // inform the client we are ready for them to login
        wsClient.send(JSON.stringify({
            type: 'login',
            publicKey: thisClient.RSAPublicKey
        } as ServerLoginMessage))

        // when the client sends a message
        wsClient.on('message', async (message: Buffer) => {

            let msg = thisClient.decrypt(message) as Message;

            if (msg.type != 'login' && !thisClient.hasLoggedIn) {
                console.log('Server:Net > Client sent a message before logging in');
                wsClient.send(JSON.stringify({
                    type: 'error',
                    message: 'You must login before sending messages',
                    fatial: true
                } as ErrorMesssage));
                wsClient.close();
                return;
            }

            switch (msg.type) {

                case 'login':
                    let loginMSG = msg as LoginMessage;
                    if (auth(loginMSG.username, loginMSG.password)) {
                        console.log('Server:Net > Client logged in as ' + loginMSG.username);
                        thisClient.Username = loginMSG.username;
                        thisClient.hasLoggedIn = true;
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
}