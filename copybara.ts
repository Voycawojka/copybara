import { Style, printLine, printTable } from "./src/cli_printer.ts";
import { handleErrors } from "./src/error_handler.ts";
import { CopybaraFsAccessError, getFileContent } from "./src/fs_accessor.ts";
import { readConfigFile } from "./src/conf_reader.ts";
import { processCliArgs, CliOption } from "./src/args_parser.ts";
import { Options } from "./src/options.ts";
import { parseAsTemplate } from "./src/file_processor.ts";

function getSupportedFlags(options: Options): CliOption[] {
    const supported = [
        {
            name: "config",
            short: "c",
            params: 1,
            description: `The configuration file. Any specified CLI options will override the config file counterparts. Default: ${options.configFile}`,
            action: ([ file ]: string[]) => {
                options.configFile = file;
                return true;
            },
        },
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
                    ...supported.map(option => [
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
    ];

    return supported;
}

async function run(): Promise<void> {
    const options = new Options();
    const supportedFlags = getSupportedFlags(options);

    if (processCliArgs(supportedFlags)) {
        try {
            const configOptions = readConfigFile(options.configFile);
            options.overrideDefaultsWithConfig(configOptions);
        } catch (error) {
            if (error instanceof CopybaraFsAccessError) {
                printLine(`Configuration file '${error.path}' not found or cannot be accessed. Ignoring it.`);
            } else {
                throw error;
            }
        }

        const inputFolder = options.inputFile.substring(0, options.inputFile.lastIndexOf("/"));
        const mainTemplate = getFileContent(options.inputFile);

        for (const parsedFile of await parseAsTemplate(mainTemplate, inputFolder, options.verbose)) {
            const dirPath = `${options.outputPath}/${parsedFile.path.slice(0, parsedFile.path.lastIndexOf("/"))}`;

            options.verbose && printLine(`Saving ${options.outputPath}/${parsedFile.path}...`);

            await Deno.mkdir(dirPath, { recursive: true });
            Deno.writeTextFile(`${options.outputPath}/${parsedFile.path}`, parsedFile.content, { create: true });
        }

        printLine("Done!", Style.success);
    }
}

if (import.meta.main) {
    handleErrors(run);
}
