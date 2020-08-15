import { getFileContent } from "./fs_accessor.ts";
import { printWarning } from "./cli_printer.ts";
import { CopybaraError } from "./error_handler.ts";

function* characterIterator(text: string) {
    for (const char of text) {
        yield char;
    }
}

function readCharactersUpTo(characters: Generator<string>, endChar: string, throwOnDone: boolean): string {
    let text = "";
    let char = characters.next();
    while (!char.done && char.value != endChar) {
        text += char.value;
        char = characters.next();
    }

    if (throwOnDone && char.done) throw new CopybaraError(`Configuration file is not correct. Expected '${endChar}' but the file ended.`);

    return text;
}

function parseIni(content: string): Map<string, string> {
    const map = new Map<string, string>();
    const characters = characterIterator(content);

    let char = characters.next();
    while(!char.done) {
        switch (char.value) {
            case ";":
                readCharactersUpTo(characters, "\n", false);
                break;
            case "[":
                const section = readCharactersUpTo(characters, "]", true);
                printWarning(`found section declaration '${section}' in the configuration file but sections are not used by Copybara. Ignoring it.`);
                break;
            case "\n":
                break;
            default:
                const key = (char.value + readCharactersUpTo(characters, "=", true)).trimStart();
                const value = readCharactersUpTo(characters, "\n", false).trimEnd();

                map.set(key, value);

                break;
        }

        char = characters.next();
    }

    return map;
}

export function readConfigFile(path: string): Map<string, string> {
    const content = getFileContent(path);
    return parseIni(content);
}
