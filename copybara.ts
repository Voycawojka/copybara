import {Style, printLine, printTable} from "./src/cli_printer.ts";
import { crawl, crawlSingle } from "./src/content_crawler.ts";

const options = {
    inputFile: "./src/template.html",
    outputPath: "./out",
    verbose: false,
};

interface CliOption {
    name: string,
    short: string | null,
    params: number,
    description: string,
    action: (params: string[]) => boolean,
}

const cliOptions: CliOption[] = [
    {
        name: "input",
        short: "i",
        params: 1,
        description: `The file to start processing from. Default: ${options.inputFile}`,
        action: ([ file ]: string[]) => {
            options.inputFile = file;
            return true;
        },
    },
    {
        name: "out",
        short: "o",
        params: 1,
        description: `The folder in which to put the processed files. Default: ${options.outputPath}`,
        action: ([ path ]: string[]) => {
            options.outputPath = path;
            return true;
        },
    },
    {
        name: "verbose",
        short: null,
        params: 0,
        description: "Causes copybara to log more information",
        action: ([]) => {
            options.verbose = true;
            return true;
        },
    },
    {
        name: "help",
        short: "h",
        params: 0,
        description: `Displays this list of commands`,
        action: ([]) => {
            const rows = [
                ["name", "alias", "params", "description"],
                ...cliOptions.map(option => [
                    `--${option.name}`, 
                    !!option.short ? `-${option.short}` : "n/a", 
                    `${option.params}`, 
                    option.description
                ]),
            ];
            printLine("");
            printTable(rows);

            return false;
        },
    },
    {
        name: "version",
        short: "v",
        params: 0,
        description: 'Displays the version of the used build',
        action: ([]) => {
            printLine("0.0.3");
            return false;
        }
    }
]

function processCommandLineArgs(): boolean {
    const args = function* () { yield* Deno.args; }();

    let arg = args.next();
    let execute = true;
    
    while (!arg.done) {
        const option = cliOptions.find(opt => arg.value === `--${opt.name}` || arg.value === `-${opt.short}`);

        if (!option) throw new Error(`Command line option "${arg.value}" is not supported. See "--help" for more information.`);

        const params: string[] = [];
        for (let i = 0; i < option.params; i ++) {
            const param = args.next()

            if (param.done || param.value.startsWith("-")) throw new Error(`Option "${arg.value}" expects ${option.params} parameters but got ${i}`);

            params.push(param.value);
        }

        execute = option.action(params);
        if (!execute) break; 

        arg = args.next();
    }

    return execute;
}

interface ParamDec {
    name: string,
    command: string,
}

interface ParamSetter {
    param: string,
    value: string,
}

interface ParsedFile {
    path: string,
    content: string,
}

async function parseFile(decoder: TextDecoder, inputFolder: string, path: string): Promise<ParsedFile[]> {
    options.verbose && printLine(`Processing ${path}...`);

    const file = decoder.decode(await Deno.readFile(path));

    const paramDecs: ParamDec[] = crawl(file, /<!-- *!cb-param *(\S+) *-->/g)
        .map(({ command, groups }) => ({ name: groups[0], command }));

    const parsedFiles: ParsedFile[] = [];
    const wrapCommand = crawlSingle(file, /<!-- *!cb-wrap *(\S+) *-->/g);

    if (wrapCommand) {
        const relativePath = wrapCommand.groups[0];
        const absolutePath = `${inputFolder}/${relativePath}`;

        options.verbose && printLine(`Reading files from ${absolutePath}`);
        for (const dirEntry of Deno.readDirSync(absolutePath)) {
            if (!dirEntry.isFile) continue;

            const wrappedPath = `${absolutePath}/${dirEntry.name}`;

            options.verbose && printLine(`Wrapping ${wrappedPath}`);
            const wrappedContent = decoder.decode(await Deno.readFile(wrappedPath));

            const paramSetters: ParamSetter[] = crawl(wrappedContent, /<!-- *!cb-param *(\S+) +"(.*)" *-->/g)
                .map(({ groups }) => ({ param: groups[0], value: groups[1] }));

            let content = file.slice(0, wrapCommand.indexBefore) + wrappedContent + file.slice(wrapCommand.indexAfter);
            for (const paramSetter of paramSetters) {
                const thisParamDecs = paramDecs.filter(dec => dec.name === paramSetter.param);

                if (thisParamDecs.length === 0) {
                    printLine(`Warning: parameter '${paramSetter.param}' is set in the content file (${wrappedPath}) but not declared in the template (${path}).`, Style.warning);
                    continue;
                }

                thisParamDecs.forEach(paramDec => content = content.replace(paramDec.command, paramSetter.value));
            }

            parsedFiles.push({
                path: `${relativePath}/${dirEntry.name}`,
                content,
            });
        }
    }

    return Promise.resolve(parsedFiles);
}

if (import.meta.main) {
    if (processCommandLineArgs()) {
        const inputFolder = options.inputFile.substring(0, options.inputFile.lastIndexOf("/"));
        const decoder = new TextDecoder("utf-8");

        for (const parsedFile of await parseFile(decoder, inputFolder, options.inputFile)) {
            const dirPath = `${options.outputPath}/${parsedFile.path.slice(0, parsedFile.path.lastIndexOf("/"))}`;

            options.verbose && printLine(`Saving ${options.outputPath}/${parsedFile.path}...`);

            await Deno.mkdir(dirPath, { recursive: true });
            Deno.writeTextFile(`${options.outputPath}/${parsedFile.path}`, parsedFile.content, { create: true });
        }

        printLine("Done!", Style.success);
    }
}
