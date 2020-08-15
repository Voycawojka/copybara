import { printLine, Style } from "./cli_printer.ts";

export class CopybaraError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export async function handleErrors(execute: () => Promise<void>): Promise<void> {
    try {
        await execute();
    } catch (error) {
        if (error instanceof CopybaraError) {
            printLine(`Error: ${error.message}`, Style.error);
        } else {
            throw error;
        }
    }
}
