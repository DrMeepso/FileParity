import exp from "constants"

export type clientConfig = {

    // server connection details
    serverIP: string,
    serverPort: number,

    username: string, // this clients username to the server
    password: string, // this clients password to the server

    parityFolder: string, // must be a valid path

}

export type serverConfig = {

    // server details
    serverPort: number,
    serverPassword: string,

    // client details
    clientTimeout: number, // in seconds

    // parity details
    parityFolder: string, // must be a valid path

}

export type Folder = {
    name: string,
    files: File[],
    folders: Folder[],

    parent: Folder | undefined
}

export type File = {
    name: string,
    size: number,
    hash: string,

    parent: Folder | undefined
}

export enum FileChangeType {

    CREATE = "CREATE",
    DELETE = "DELETE",
    MODIFY = "MODIFY"

}

export enum FolderChangeType {

    CREATE = "CREATE",
    DELETE = "DELETE"

}

export type Message = {

    type: string;

}

export interface LoginMessage extends Message {

    type: 'login',
    username: string,
    password: string

}

export interface ErrorMesssage extends Message {

    type: 'error',
    message: string,
    fatial?: boolean

}

export interface FileStructureMessage extends Message {

    type: 'fileStructure',
    folder: Folder

}