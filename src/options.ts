import { CopybaraError } from "./error_handler.ts";
import { printWarning } from "./cli_printer.ts";

export class Options {
    public configFile = "./copybara.ini";
    public inputFile = "./src/template.html";
    public outputPath = "./out";
    public verbose = false;
    public produceJson = false;

    public overrideDefaultsWithConfig(configOpts: Map<string, string>) {
        const defaultOptions: any = new Options();
        const thisOptions: any = this;
    
        for (const [key, value] of configOpts) {
            if (!thisOptions.hasOwnProperty(key)) throw new CopybaraError(`Unknown option '${key}' in the configuration file.`);
    
            if (thisOptions[key] === defaultOptions[key]) {
                thisOptions[key] = value;
            } else if (thisOptions[key] !== value) {
                printWarning(`option '${key}' is specified differently in the configuration file and in the command line arguments. Using the value from CLI.`);
            }
        }
    }

    public clone(): Options {
        const cloned = new Options() as any
        const looseThis = this as any

        for (const prop of Object.getOwnPropertyNames(this)) {
            cloned[prop] = looseThis[prop]
        }

        return cloned;
    }
}
