
//import * as fs from 'fs';
//import * as path from 'path';
//import * as ical from 'ical';

//ical

//import Scraper from "./Scraper";
import { setTimeout } from "timers";
import RecurseScraper from "./Scraper/RecurseScraper";
import { writeFileSync } from "fs";

//const s = new Scraper({
//    baseUrl: "http://www.plany.ath.bielsko.pl",
//    outputPath: "data.json",
//});
const s = new RecurseScraper({
    baseUrl: "http://www.plany.ath.bielsko.pl",
    outputPath: "data_2.json",
    maxRecursionDepth: 7,
    initialDate: 1316383200000
});
s.run();
setTimeout(() => { }, 100000);