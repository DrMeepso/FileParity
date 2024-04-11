import fs from 'fs';
import crypto from 'crypto';

export function getFileHash(filePath: string): Promise<string> {

    return new Promise((resolve, reject) => {

        // create a hash object
        const hash = crypto.createHash('sha256');

        // create a read stream
        const stream = fs.readFileSync(filePath);

        // pipe the stream to the hash object
        hash.update(stream);

        // end the stream
        resolve(hash.digest('hex'));

    })

}