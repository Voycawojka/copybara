const args = function* () { yield* Deno.args; }();

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
            console.log(`\nname\t short\t params\t description`);
            for (const option of cli_opts) {
                console.log(`--${option.name}\t -${option.short}\t ${option.params}\t ${option.description}\t`);
            }
            console.log('\n');
            return false;
        },
    }
]

function processCommandLineArgs(): boolean {
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

        const execute = option.action(params);
        if (!execute) break; 
    }

    return execute;
}

interface ParsedFile {
    path: string,
    content: string
}

async function parseFile(decoder: TextDecoder, input_folder: string, path: string): Promise<ParsedFile[]> {
    console.log(`Processing ${path}...`);

    const file = decoder.decode(await Deno.readFile(path));
    const wrap_re = /<!-- *!cb-wrap *(\S*) *-->/g;
    const match_arr = wrap_re.exec(file);
    let parsed_files: ParsedFile[] = [];

    if (match_arr !== null) {
        const [command, relative_path] = match_arr;
        const absolute_path = `${input_folder}/${relative_path}`;

        for (const dir_entry of Deno.readDirSync("./src/data")) {
            if (!dir_entry.isFile) continue;

            const wrapped_path = `${absolute_path}/${dir_entry.name}`;

            console.log(`Wrapping ${wrapped_path}`);
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
    const input_folder = options.input_file.substring(0, options.input_file.lastIndexOf("/"));
    const decoder = new TextDecoder("utf-8");

    if (processCommandLineArgs()) {
        for (const parsed_file of await parseFile(decoder, input_folder, options.input_file)) {
            const dir_path = `${options.output_path}/${parsed_file.path.slice(0, parsed_file.path.lastIndexOf("/"))}`;

            console.log(`Saving ${options.output_path}/${parsed_file.path}...`);

            await Deno.mkdir(dir_path, { recursive: true });
            Deno.writeTextFile(`${options.output_path}/${parsed_file.path}`, parsed_file.content, { create: true });
        }
    }
}
