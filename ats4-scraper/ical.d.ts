declare module "node-ical" {
    export function parseICS(str: string): ICalData;
    export function parseICS(str: string, cb: (err: Error, data: ICalData) => void): void;
    export function parseFile(filename: string): ICalData;
    export function parseFile(filename: string, cb: (err: Error, data: ICalData) => void): void;
    export function fromURL(url: string, options: object, cb: (err: Error, data: ICalData) => void): void;

    export interface ICalData {
        [key: string]: ICalEntry
    }
    export interface ICalEntry {
        type: "VEVENT" | string,
        params: Array<any>,
        start: Date,
        end: Date,
        dtstamp: Date,
        uid: string,
        class: "PUBLIC" | string,
        sequence: string,
        status: "CONFIRMED" | string,
        summary: string,
        transparency: "OPAQUE" | string
    }
}