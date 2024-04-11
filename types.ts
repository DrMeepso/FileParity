export type clientConfig = {

    // server connection details
    serverIP: string,
    serverPort: number,
    serverPassword: string,

    username: string, // this clients username to the server

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
    folders: Folder[]
}

export type File = {
    name: string,
    size: number,
    hash: string
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