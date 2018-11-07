import Plan from "../Plan";
import { readFile, writeFile } from "fs";
import { promisify } from "util";
import * as ical from "node-ical";
import * as moment from "moment";

export default class IcsToJson {
    private inputPath: string;
    private outputPath: string;
    constructor(inputPath: string, outputPath: string) {
        this.inputPath = inputPath;
        this.outputPath = outputPath;
    }

    public async parse(plan: Plan): Promise<ical.ICalEntry[]> {
        let icsBuf: Buffer = await promisify(readFile)(`${this.inputPath}\\${plan.id}.ics`);

        let icsData: ical.ICalData = await promisify(ical.parseICS)(icsBuf.toString());
        let validIcsData: ical.ICalEntry[] = Object.values(icsData).filter((value) => {
            if (value.type !== "VEVENT") {
                return false;
            }
            return true;
        })
        .sort((a, b) => {
            return a.start.getTime() - b.start.getTime();
            });

        await promisify(writeFile)(`${this.outputPath}\\${plan.id}.json`, JSON.stringify(validIcsData));
        return validIcsData;
    }

    private async forEachAsync<T>(array: T[], callback: (value: T, index: number, array: T[]) => Promise<void>, thisArg?: any, waitTimeMs: number = 2000): Promise<void> {
        for (let i = 0; i < array.length; i++) {
            await callback.apply(thisArg || this, [array[i], i, array])
        }
    }
}