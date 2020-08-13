import {Style, printLine, printTable} from "./src/cli_printer.ts";

const options = {
    input_file: "./src/template.html",
    output_path: "./out",
};

interface CliOption {
    name: string,
    short: string,
    params: number,
    description: string,
    action: (params: string[]) => boolean,
}

const cli_opts: CliOption[] = [
    {
        name: "input",
        short: "i",
        params: 1,
        description: `The file to start processing from. Default: ${options.input_file}`,
        action: ([ file ]: string[]) => {
            options.input_file = file;
            return true;
        },
    },
    {
        name: "out",
        short: "o",
        params: 1,
        description: `The folder in which to put the processed files. Default: ${options.output_path}`,
        action: ([ path ]: string[]) => {
            options.output_path = path;
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
                ...cli_opts.map(option => [
                    `--${option.name}`, 
                    `-${option.short}`, 
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
            printLine("0.0.2");
            return false;
        }
    }
]

function processCommandLineArgs(): boolean {
    const args = function* () { yield* Deno.args; }();

    let arg = args.next();
    let execute = true;
    
    while (!arg.done) {
        const option = cli_opts.find(opt => arg.value === `--${opt.name}` || arg.value === `-${opt.short}`);

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

interface ParsedFile {
    path: string,
    content: string
}

async function parseFile(decoder: TextDecoder, input_folder: string, path: string): Promise<ParsedFile[]> {
    printLine(`Processing ${path}...`);

    const file = decoder.decode(await Deno.readFile(path));
    const wrap_re = /<!-- *!cb-wrap *(\S*) *-->/g;
    const match_arr = wrap_re.exec(file);
    const parsed_files: ParsedFile[] = [];

    if (match_arr !== null) {
        const [command, relative_path] = match_arr;
        const absolute_path = `${input_folder}/${relative_path}`;

        printLine(`Reading files from ${absolute_path}`);
        for (const dir_entry of Deno.readDirSync(absolute_path)) {
            if (!dir_entry.isFile) continue;

            const wrapped_path = `${absolute_path}/${dir_entry.name}`;

            printLine(`Wrapping ${wrapped_path}`);
            const wrapped_content = decoder.decode(await Deno.readFile(wrapped_path));

            parsed_files.push({
                path: `${relative_path}/${dir_entry.name}`,
                content: file.slice(0, wrap_re.lastIndex - command.length) + wrapped_content + file.slice(wrap_re.lastIndex)
            });
        }
    }

    return Promise.resolve(parsed_files);
}

if (import.meta.main) {
    if (processCommandLineArgs()) {
        const input_folder = options.input_file.substring(0, options.input_file.lastIndexOf("/"));
        const decoder = new TextDecoder("utf-8");

        for (const parsed_file of await parseFile(decoder, input_folder, options.input_file)) {
            const dir_path = `${options.output_path}/${parsed_file.path.slice(0, parsed_file.path.lastIndexOf("/"))}`;

            printLine(`Saving ${options.output_path}/${parsed_file.path}...`);

            await Deno.mkdir(dir_path, { recursive: true });
            Deno.writeTextFile(`${options.output_path}/${parsed_file.path}`, parsed_file.content, { create: true });
        }

        printLine("Done!", Style.success);
    }
}
