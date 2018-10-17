declare module "ical" {
    export default class {
        public parseICS(str: string): object;
        public parseFile(filename: string): object;
    }
}