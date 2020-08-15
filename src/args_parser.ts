import { CopybaraError } from "./error_handler.ts";

export interface CliOption {
    name: string,
    short: string | null,
    params: number,
    description: string,
    action: (params: string[]) => boolean,
}

interface Flag {
    name: string,
    full: boolean,
    params: string[],
}

function getCliFlags(): Flag[] {
    const args = function* () { yield* Deno.args; }();
    const flags: Flag[] = [];
    let arg = args.next();
    
    while (!arg.done) {
        if (arg.value.startsWith("--")) {
            flags.push({
                name: arg.value.slice(2),
                full: true,
                params: [],
            });
        } else if (arg.value.startsWith("-")) {
            flags.push({
                name: arg.value.slice(1),
                full: false,
                params: [],
            });
        } else {
            if (flags.length === 0) throw new CopybaraError(`Unrecognised subcommand '${arg.value}'.`);

            flags[flags.length - 1].params.push(arg.value);
        }

        arg = args.next();
    }

    return flags;
}

export function processCliArgs(supported: CliOption[]): boolean {
    const flags = getCliFlags();
    let execute = true;

    for (const flag of flags) {
        const option = supported.find(option => (flag.full && option.name === flag.name) || option.short === flag.name);

        if (!option) throw new CopybaraError(`Unrecognised option '${flag.name}'.`);
        if (option.params !== flag.params.length) throw new CopybaraError(`Option '${flag.name}' expected ${option.params} arguments but got ${flag.params.length}`);

        const allowExecution = option.action(flag.params);

        if (!allowExecution) {
            execute = false;
        }
    }

    return execute;
}
