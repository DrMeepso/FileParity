import EventEmitter from "node:events";
import fs from "node:fs";
import chokidar from "chokidar";
import { Folder, File, FileChangeType, FolderChangeType } from './types';
import { getFileHash } from "./utils";

export class DirWatcher extends EventEmitter {

    folder = {
        name: '',
        files: [],
        folders: []
    } as Folder;

    watcher: chokidar.FSWatcher;

    // list of files to ignore
    ignoreList: string[] = [];

    watcherPath: string;

    constructor(path: string) {
        super();

        this.watcherPath = path;

        // make sure the folder is valid
        if (!fs.existsSync(path)) {
            console.error('folder does not exist');
            process.exit();
        }

        this.folder.name = path.split("/").at(-1) as string;

        this.watcher = chokidar.watch(path, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        });

        // when a file is added
        this.watcher.on('add', (path) => {
            this.fileChanged(FileChangeType.CREATE, path, this.folder);
        })

        // when a file is changed
        this.watcher.on('change', (path) => {
            this.fileChanged(FileChangeType.MODIFY, path, this.folder);
        })

        // when a file is removed
        this.watcher.on('unlink', (path) => {
            this.fileChanged(FileChangeType.DELETE, path, this.folder);
        })

        // when a directory is added
        this.watcher.on('addDir', (path) => {
            this.folderChanged(FolderChangeType.CREATE, path, this.folder);
        })

        // when a directory is removed
        this.watcher.on('unlinkDir', (path) => {
            this.folderChanged(FolderChangeType.DELETE, path, this.folder);
        })

        this.watcher.on('ready', async () => {
            console.log('Watcher:FS > Initial scan complete. Ready for changes');
            let nullF = this.folder.folders.find((f) => f.name == undefined);
            if (nullF) {
                this.folder.folders.splice(this.folder.folders.indexOf(nullF), 1);
            }
        })

    }

    async fileChanged(changeType: FileChangeType, path: string, mainFolder: Folder) {

        let pathArray = path.split("\\");
        pathArray.shift(); // the first element is always the parent folder of the folder
        pathArray.shift(); // the second element is always the folder

        if (this.ignoreList.includes(pathArray.join("\\"))) {
            // remove the path from the ignore list
            return;
        }

        console.log(`Watcher > File changed: ${changeType} - ${path}`);

        let fileName = pathArray.pop(); // the last element is always the file name

        let currentFolder = mainFolder;
        for (const folder of pathArray) {
            let f = currentFolder.folders.find((f) => f.name === folder);
            if (f) {
                currentFolder = f;
            } else {
                throw new Error(`Folder ${folder} not found!`);
            }
        }

        switch (changeType) {

            case FileChangeType.CREATE:

                const stats = fs.statSync(path);

                currentFolder.files.push({
                    name: fileName,
                    size: stats.size,
                    hash: await getFileHash(path)
                } as File);

                break;

            case FileChangeType.MODIFY:

                const file = currentFolder.files.find((f) => f.name === fileName);
                if (file) {
                    file.hash = await getFileHash(path);
                } else {
                    throw new Error(`File ${fileName} not found!`);
                }

                break;

            case FileChangeType.DELETE:

                const index = currentFolder.files.findIndex((f) => f.name === fileName);
                if (index > -1) {
                    currentFolder.files.splice(index, 1);
                } else {
                    throw new Error(`File ${fileName} not found!`);
                }

                break;

        }

    }

    async folderChanged(changeType: FolderChangeType, path: string, mainFolder: Folder) {

        let pathArray = path.split("\\");
        pathArray.shift(); // the first element is always the parent folder of the folder
        pathArray.shift(); // the second element is always the folder

        if (this.ignoreList.includes(pathArray.join("\\"))) {
            // remove the path from the ignore list
            return;
        }

        console.log(`Watcher > Folder changed: ${changeType} - ${path}`);

        let folderName = pathArray.pop(); // the last element is always the folder name

        let currentFolder = mainFolder;
        for (const folder of pathArray) {
            let f = currentFolder.folders.find((f) => f.name === folder);
            if (f) {
                currentFolder = f;
            } else {
                throw new Error(`Folder ${folder} not found!`);
            }
        }

        switch (changeType) {

            case FolderChangeType.CREATE:

                if (currentFolder.folders.find((f) => f.name === folderName)) {
                    throw new Error(`Folder ${folderName} already exists!`);
                }

                if (folderName === "" || folderName === null) {
                    return
                }

                currentFolder.folders.push({
                    name: folderName,
                    files: [],
                    folders: []
                } as Folder);

                break;

            case FolderChangeType.DELETE:

                const index = currentFolder.folders.findIndex((f) => f.name === folderName);
                if (index > -1) {
                    currentFolder.folders.splice(index, 1);
                } else {
                    throw new Error(`Folder ${folderName} not found!`);
                }

                break;

        }

    }

    async writeFile(path: string, data: string) {
    
        this.ignoreList.push(path);

        try {
            fs.writeFileSync(this.watcherPath + "\\" + path, data);
        } catch (e) {
            console.error("Watcher:FS - Error > " + String(e));
        }

        setInterval(async () => {
            this.ignoreList.splice(this.ignoreList.indexOf(path), 1);
        }, 150)

    }

    async deleteFile(path: string) {
    
        this.ignoreList.push(path);

        try {
            fs.unlinkSync(this.watcherPath + "\\" + path);
        } catch (e) {
            console.error("Watcher:FS - Error > " + String(e));
        }
        
        setInterval(async () => {
            this.ignoreList.splice(this.ignoreList.indexOf(path), 1);
        }, 150)

    }

    async createFolder(path: string) {
    
        this.ignoreList.push(path);

        try {
            fs.mkdirSync(this.watcherPath + "\\" + path);
        } catch (e) {
            console.error("Watcher:FS - Error > " + String(e));
        }

        setInterval(async () => {
            this.ignoreList.splice(this.ignoreList.indexOf(path), 1);
        }, 150)

    }

    async deleteFolder(path: string) {
    
        this.ignoreList.push(path);

        try {
            fs.rmdirSync(this.watcherPath + "\\" + path);
        } catch (e) {
            console.error("Watcher:FS - Error > " + String(e));
        }

        setInterval(async () => {
            this.ignoreList.splice(this.ignoreList.indexOf(path), 1);
        }, 150)

    }

}