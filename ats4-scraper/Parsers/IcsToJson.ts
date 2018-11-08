import Plan from "../Plan";
import { readFile, writeFile, existsSync } from "fs";
import { promisify } from "util";
import * as ical from "ical";
import * as moment from "moment";
import { PlanData } from "../Types";

export default class IcsToJson {
    private inputPath: string;
    private outputPath: string;
    constructor(inputPath: string, outputPath: string) {
        this.inputPath = inputPath;
        this.outputPath = outputPath;
    }

    private async parseICS(str: string): Promise<ical.ICalData> {
        return new Promise<ical.ICalData>((resolve, reject) => {
            let data: ical.IC0.0alData = ical.parseICS(str);
            resolve(data);
        });
    }

    public async parse(plan: Plan): Promise<PlanData[]> {
        if (existsSync(`${this.outputPath}\\${plan.id}.json`)) {
            let buf: Buffer = await promisify(readFile)(`${this.outputPath}\\${plan.id}.json`);
            return JSON.parse(buf.toString());
        }
        let icsBuf: Buffer = await promisify(readFile)(`${this.inputPath}\\${plan.id}.ics`);

        let icsData: ical.ICalData = await this.parseICS(icsBuf.toString());
        let validIcsData: ical.ICalEntry[] = Object.values(icsData).filter((value) => {
            if (value.type !== "VEVENT") {
                return false;
            }
            return true;
        })
        .sort((a, b) => {
            return a.start.getTime() - b.start.getTime();
            });
        let output: PlanData[] = [];
        validIcsData.forEach((data) => {
            output.push({
                name: data.summary,
                starts: data.start,
                lasts: data.end.getTime() - data.start.getTime()
            });
        });

        await promisify(writeFile)(`${this.outputPath}\\${plan.id}.json`, JSON.stringify(output));
        return output;
    }

    private async forEachAsync<T>(array: T[], callback: (value: T, index: number, array: T[]) => Promise<void>, thisArg?: any, waitTimeMs: number = 2000): Promise<void> {
        for (let i = 0; i < array.length; i++) {
            await callback.apply(thisArg || this, [array[i], i, array])
        }
    }
}