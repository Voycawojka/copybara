import { crawl, crawlSingle } from "./content_crawler.ts";
import { printLine, printWarning } from "./cli_printer.ts";
import { getFilesInDir, getFileContent } from "./fs_accessor.ts";

interface ParamDeclaration {
    name: string,
    command: string,
}

interface ParamSetter {
    param: string,
    value: string,
}

interface FileToCreate {
    path: string,
    content: string,
    paramSetters: ParamSetter[],
}

export async function parseAsTemplate(content: string, templateDirLocation: string, verbose: boolean): Promise<FileToCreate[]> {
    const paramDecs: ParamDeclaration[] = crawl(content, /<!-- *!cb-param *(\S+) *-->/g).map(({ command, groups }) => ({ name: groups[0], command }));
    const wrapCommand = crawlSingle(content, /<!-- *!cb-wrap *(\S+) *-->/g);

    const parsedFiles: FileToCreate[] = [];

    if (wrapCommand) {
        const contentDirLocation = `${templateDirLocation}/${wrapCommand.groups[0]}`;

        verbose && printLine(`Reading files from ${contentDirLocation}`);
        for (const contentFileName of getFilesInDir(contentDirLocation)) {
            const contentFileLocation = `${contentDirLocation}/${contentFileName}`;

            verbose && printLine(`Wrapping ${contentFileLocation}`);
            const contentFile = getFileContent(contentFileLocation);

            const contentFiles = await parseAsTemplate(contentFile, contentDirLocation, verbose);
            if (contentFiles.length > 0) {
                for (const f of contentFiles) {
                    parsedFiles.push(f);
                }
                continue;
            }

            const paramSetters: ParamSetter[] = crawl(contentFile, /<!-- *!cb-param *(\S+) +"(.*)" *-->/g)
                .map(({ groups }) => ({ param: groups[0], value: groups[1] }));

            let parsedContent = content.slice(0, wrapCommand.indexBefore) + contentFile + content.slice(wrapCommand.indexAfter);
            for (const paramSetter of paramSetters) {
                const thisParamDecs = paramDecs.filter(dec => dec.name === paramSetter.param);

                if (thisParamDecs.length === 0) {
                    printWarning(`parameter '${paramSetter.param}' is set in the content file (${contentFileLocation}) but not declared in the template.`);
                    continue;
                }

                thisParamDecs.forEach(paramDec => parsedContent = parsedContent.replace(paramDec.command, paramSetter.value));
            }

            parsedFiles.push({
                path: contentFileLocation,
                content: parsedContent,
                paramSetters,
            });
        }
    }

    return Promise.resolve(parsedFiles);
}
