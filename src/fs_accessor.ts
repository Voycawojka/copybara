import { CopybaraError } from "./error_handler.ts";

export class CopybaraFsAccessError extends CopybaraError {
    constructor(public path: string) {
        super(`Cannot find/access file or directory '${path}'`);
    }
}

const decoder = new TextDecoder("utf-8");

export function getFilesInDir(path: string): string[] {
    let contents: Iterable<Deno.DirEntry>;
    
    try {
        contents = Deno.readDirSync(path);
    } catch (_) {
        throw new CopybaraFsAccessError(path);
    }

    return Array
    .from(contents)
    .filter(entry => entry.isFile)
    .map(entry => entry.name);
}

export function getFileContent(path: string): string {
    let binaryContent: Uint8Array;
    
    try {
        binaryContent = Deno.readFileSync(path);
    } catch (_) {
        throw new CopybaraFsAccessError(path);
    }

    return decoder.decode(binaryContent);
}
