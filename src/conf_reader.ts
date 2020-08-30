import { getFileContent } from "./fs_accessor.ts";
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

export interface Section {
    name: string | null,
    options: Map<string, string>,
}

function parseIni(content: string): Section[] {
    const sections: Section[] = [];
    const characters = characterIterator(content);

    let currentSection: Section = {
        name: null,
        options: new Map<string, string>()
    };

    let char = characters.next();
    while(!char.done) {
        switch (char.value) {
            case ";":
                readCharactersUpTo(characters, "\n", false);
                break;
            case "[":
                const section = readCharactersUpTo(characters, "]", true);

                sections.push(currentSection);
                currentSection = {
                    name: section,
                    options: new Map<string, string>(),
                };

                break;
            case "\n":
                break;
            default:
                const key = (char.value + readCharactersUpTo(characters, "=", true)).trimStart();
                const value = readCharactersUpTo(characters, "\n", false).trimEnd();

                currentSection.options.set(key, value);

                break;
        }

        char = characters.next();
    }

    sections.push(currentSection);
    
    return sections.filter(section => section.options.size > 0)
}

export function readConfigFile(path: string): Section[] {
    const content = getFileContent(path);
    return parseIni(content);
}
