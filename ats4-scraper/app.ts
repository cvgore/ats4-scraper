
//import * as fs from 'fs';
//import * as path from 'path';
//import * as ical from 'ical';

//ical

import Scraper from "./Scraper";
import { setTimeout } from "timers";

const s = new Scraper({
    baseUrl: "http://www.plany.ath.bielsko.pl",
    outputPath: "data.json"
});
setTimeout(() => { }, 100000);