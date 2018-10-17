import iCalEvent from "./Event";
import * as fs from "fs";
import * as path from "path";
import FileNotFoundError from "./FileNotFoundError";
import iCal from "./iCal";
import * as readline from 'readline';

const propertyRegex = /^(\w+):(.+)$/i;

export default class Parser {
    private filename: string;
    private output: iCal;

    constructor(filename: string) {
        this.filename = filename;
    }

    public async parse(): Promise<iCal> {
        let resolvedFilename = path.resolve(this.filename);
        if (!fs.existsSync(resolvedFilename)) {
            throw new FileNotFoundError(`No such file as ${resolvedFilename}`);
        }

        let fstream = fs.createReadStream(resolvedFilename);
        let data = await this.process(fstream);       
    }

    private processLine(line: string): void {
        let prop = line.match(propertyRegex);

        if (prop === null) {
            // maybe a string continuation
        } else {

        }
    }

    private process(rs: fs.ReadStream): Promise<iCal> {
        return new Promise<iCal>((resolve, reject) => {
            let rline = readline.createInterface({
                input: rs,
                crlfDelay: Infinity
            });
            rline.on('line', (input) => {
                this.processLine(input);
            });
            rline.on('close', () => {
                return resolve(this.output);
            });
        })
    }
}