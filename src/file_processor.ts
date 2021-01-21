import { crawl, crawlSingle } from "./content_crawler.ts";
import { printLine, printWarning } from "./cli_printer.ts";
import { getFilesInDir, getFileContent } from "./fs_accessor.ts";

interface ParamDeclaration {
    name: string,
    command: string,
}

export interface ParamSetter {
    param: string,
    value: string,
}

interface EachDeclaration {
    section: string,
    templatePath: string,
    options: any,
    command: string,
}

interface FileToCreate {
    path: string,
    content: string,
    paramSetters: ParamSetter[],
}

export interface JsonContentFile {
    path: string,
    parameters: ParamSetter[]
}

function findParamDeclarations(text: string): ParamDeclaration[] {
    return crawl(text, /<!-- *!cb-param +(\S+) *-->/g)
        .map(({ command, groups }) => ({ name: groups[0], command }));
}

function findEachCommands(text: string): EachDeclaration[] {
    return crawl(text, /<!-- *!cb-each +"(.*)" +(.*) +{(.*)} *-->/g)
        .map(({ command, groups }) => ({ 
            section: groups[0], 
            templatePath: groups[1], 
            options: JSON.parse(`{${groups[2]}}`), 
            command 
    }));
}

function putValuesForParamDeclarations(text: string, paramSetters: ParamSetter[]): string {
    const paramDecs = findParamDeclarations(text);
    let parsedText = text;
    
    for (const paramSetter of paramSetters) {
        const thisParamDecs = paramDecs.filter(dec => dec.name === paramSetter.param);

        if (thisParamDecs.length === 0) {
            continue;
        }

        thisParamDecs.forEach(paramDec => parsedText = parsedText.replace(paramDec.command, paramSetter.value));
    }

    return parsedText;
}

function parseEachCommands(text: string, templateDirLocation: string, contentFilesJsons: Map<string, JsonContentFile[]>, verbose: boolean): string {
    let parsedText = text;

    findEachCommands(text).forEach(eachCommand => {
        verbose && printLine(`Reading template ${templateDirLocation}/${eachCommand.templatePath}`);
        const eachContent = getFileContent(`${templateDirLocation}/${eachCommand.templatePath}`);
        
        const sectionJson = contentFilesJsons.get(eachCommand.section);

        if (sectionJson) {
            const sortBy = eachCommand.options.sortBy
            const parsedEachContents = sectionJson
                .sort((a, b) => !!sortBy ? (b.parameters.find(p => p.param === sortBy)?.value ?? '').localeCompare(a.parameters.find(p => p.param === sortBy)?.value ?? '') : 1)
                .map(contentFile => putValuesForParamDeclarations(eachContent, [
                    ...contentFile.parameters, 
                    { param: "_cb_path", value: normalizePath(contentFile.path) }
                ]));

            parsedText = parsedText.replace(eachCommand.command, parsedEachContents.join("\n"));
        } else {
            printWarning(`Template declares 'each' command for section '${eachCommand.section}' but this section is not found. It either doesn't exist or the sections are in the wrong order in the config file.`);
        }
    });

    return parsedText;
}

function normalizePath(path: string): string {
    return path.replaceAll("//", "/").replaceAll("./", "")
}

export async function parseAsTemplate(content: string, templateDirLocation: string, contentFilesJsons: Map<string, JsonContentFile[]>, executionName: string | null, verbose: boolean): Promise<FileToCreate[]> {
    const parsedFiles: FileToCreate[] = [];

    content = parseEachCommands(content, templateDirLocation, contentFilesJsons, verbose);

    const wrapCommand = crawlSingle(content, /<!-- *!cb-wrap +(\S+) *-->/g);

    if (wrapCommand) {
        const contentDirLocation = `${templateDirLocation}/${wrapCommand.groups[0]}`;

        verbose && printLine(`Reading files from ${contentDirLocation}`);
        for (const contentFileName of getFilesInDir(contentDirLocation)) {
            const contentFileLocation = `${contentDirLocation}/${contentFileName}`;

            verbose && printLine(`Wrapping ${contentFileLocation}`);
            const contentFile = getFileContent(contentFileLocation);

            const paramSetters: ParamSetter[] = crawl(contentFile, /<!-- *!cb-param +(\S+) +"(.*)" *-->/g)
                .map(({ groups }) => ({ param: groups[0], value: groups[1] }));

            const wrappedContent = content.slice(0, wrapCommand.indexBefore) + contentFile + content.slice(wrapCommand.indexAfter);
            const contentWithParams = putValuesForParamDeclarations(wrappedContent, paramSetters);
            const eachedContent = parseEachCommands(contentWithParams, templateDirLocation, contentFilesJsons, verbose);
           
            parsedFiles.push({
                path: `${wrapCommand.groups[0]}/${contentFileName}`,
                content: eachedContent,
                paramSetters,
            });
        }
    } else {
        parsedFiles.push({
            path: `${executionName ?? "undefined"}.html`,
            content,
            paramSetters: [],
        });
    }

    return Promise.resolve(parsedFiles);
}
