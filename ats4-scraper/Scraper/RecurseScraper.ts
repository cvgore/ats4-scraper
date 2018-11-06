import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import * as winston from "winston";
import { writeFileSync } from "fs";
import { ILeftTreeBranch, RecurseScraperConfig, RecurseScrappedData, RecurseRootData } from "../Types";
import RegexMatchFailedError from "../Errors/RegexMatchFailed";
import MissingRequiredParameter from "../Errors/MissingRequiredParameter";
import TooMuchRecursionError from "../Errors/TooMuchRecursionError";

const enum DepartmentRegexValues {
    Type = 1,
    Id, Branch = 2,
    Link,
    Name
}

const enum LeftTreeBranchRegexValues {
    Id = 1, Branch = 1,
    Type,
    Link,
    PlanType,
    AnchorName,
    Name
}

const enum PlanRegexValues {
    Type = 1,
    Id,
    Name
}

export default class RecurseScraper {
    public static readonly version = "0.1.0";
    private readonly departmentRegex: RegExp = /onclick="branch\((\d+),(\d+),(\d+),'([a-z ąćżśłóźńę,-]+)'\);">/gi;
    private readonly planRegex: RegExp = /<a href="plan\.php\?type=(\d+)&amp;id=(\d+)" target="[^"]*">([0-9a-z ąćżśłóźńę,\/-]+)<\/a>/gi;
    private readonly leftTreeBranchRegex: RegExp = /<li[^>]*><img\s+src='[^']*'\s+alt='[^']*'\s+id='[^']*'\s+onclick="\s+get_left_tree_branch\(\s+'(\d+)',\s+'img_\d+',\s+'div_\d+',\s+'(\d+)',\s+'?(\d+)'\s+\);\s+"\s+onmouseover="[^"]*"[^>]*>\s*(?:<a\s+href="plan\.php\?type=(\d+)&amp;id=\d+"[^>]*>([0-9a-z ąćżśłóźńę,\/-]+)<\/a>|([a-z ąćżśłóźńę,-\/]+))<div[^>]*><\/div><\/li>/gi;
    private config: RecurseScraperConfig;

    private $axios: AxiosInstance;
    private scrappedData: RecurseRootData[] = [];
    private $logger: winston.Logger;
    private dataFetchCount: number = 0;

    constructor(config: RecurseScraperConfig) {
        if (typeof config.baseUrl === "undefined") {
            throw new MissingRequiredParameter("Base URL parameter is required!");
        }
        this.config = config;
        this.$logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [
                new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston.transports.File({ filename: 'logs/log.log' }),
            ]
        });
        if (process.env.NODE_ENV !== 'production') {
            this.$logger.add(new winston.transports.Console({
                format: winston.format.simple()
            }));
        }
        this.$logger.info(`ATS4-Scraper v.${RecurseScraper.version} starting...`);
        this.$axios = axios.create({
            headers: {
                //'User-Agent': `ATS4-Scrapper/${RecurseScraper.version} (https://github.com/cvgore/ats4-scrapper)`
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:21.37) Gecko/20100101 Firefox/13.37'
            }
        });
        this.$logger.info(`Axios HTTP client created`);
    }

    public get data(): RecurseRootData[] {
        return this.scrappedData;
    }

    public async run(): Promise<boolean> {
        if (!await this.testConnectionBefore()) {
            this.$logger.error(`No response from server received, halting!`);
            return false;
        }
        this.$logger.info(`Successful connection test to ${this.config.baseUrl}`);

        let html: AxiosResponse<string> = await this.$axios.get<string>(this.departmentsUrl());

        let fetchedDepartments: RegExp = new RegExp(this.departmentRegex, 'gi');
        var match: RegExpExecArray;

        if (!fetchedDepartments.test(html.data)) {
            throw new RegexMatchFailedError(`Regex for departments failed`);
        }

        this.resetIndex(fetchedDepartments);

        while (match = fetchedDepartments.exec(html.data)) {
            await this.wait(1000);
            let siblings: RecurseScrappedData[] = await this.getLeftTreeBranchContents(
                this.getMatchResult(match, DepartmentRegexValues.Type),
                this.getMatchResult(match, DepartmentRegexValues.Branch),
            );

            this.scrappedData.push({
                name: this.getMatchResultString(match, DepartmentRegexValues.Name),
                siblings
            });
            return true;
        }
        this.$logger.info("Fetched all data");
    }

    private resetIndex(regex: RegExp): void {
        regex.lastIndex = 0;
    }

    private async wait(ms: number): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.$logger.info(`Waiting ${ms} ms...`);
            setTimeout(() => {
                resolve(true);
            }, ms);
        });
    }

    private getMatchResultString(match: RegExpExecArray, id: number): string | null {
        if (typeof match[id] !== 'undefined')
            return match[id];
        return null;
    }

    private getMatchResult(match: RegExpExecArray, id: number): number | null {
        if (typeof match[id] !== 'undefined')
            return Number(match[id]);
        return null;
    }

    private async testConnectionBefore(): Promise<boolean> {
        try {
            await this.$axios.get<string>(this.config.baseUrl);
            return true;
        } catch (ex) {
            return false;
        }
    }

    private leftTreeBranchUrl(type: number, branch: number): string {
        return `${this.config.baseUrl}/left_menu_feed.php?type=${type}&branch=${branch}`;
    }

    private planUrl(type: number, id: number): string {
        return `${this.config.baseUrl}/plan.php?type=${type}&id=${id}&cvsfile=true`;
    }

    private departmentsUrl(): string {
        return `${this.config.baseUrl}/left_menu.php`;
    }
    private async getLeftTreeBranchContents(type: number, branch: number, recurseDepth: number = 1): Promise<RecurseScrappedData[]> {
        if (++recurseDepth > this.config.maxRecursionDepth) {
            throw new TooMuchRecursionError(`Max recursion depth limit exceeded - ${this.config.maxRecursionDepth} was set, current depth - ${recurseDepth}`);
        }
        this.dataFetchCount++;
        let url: string = this.leftTreeBranchUrl(type, branch);
        this.$logger.info(`Requesting leftTreeBranch data - ${url}`);
        let html: AxiosResponse<string> = await this.$axios.post<string>(url);
        let foundData = new RegExp(this.leftTreeBranchRegex, 'gi');
        let data: RecurseScrappedData[] = [];
        let match: RegExpExecArray;
        let noMoreBranchesToExpand: boolean = false;
        if (!foundData.test(html.data)) {
            this.$logger.info(`Probably last node found - no more`)
            foundData = new RegExp(this.planRegex, 'gi');
            if (!foundData.test(html.data)) {
                throw new RegexMatchFailedError(`Unknown content on ${url}`);
            }
            noMoreBranchesToExpand = true;
        }
        this.resetIndex(foundData);
        while (match = foundData.exec(html.data)) {
            let id = this.getMatchResult(match, noMoreBranchesToExpand ? PlanRegexValues.Id : LeftTreeBranchRegexValues.Id);
            let type = this.getMatchResult(match, noMoreBranchesToExpand ? PlanRegexValues.Type : LeftTreeBranchRegexValues.Type);
            let siblingsData: RecurseScrappedData[] = [];
            if (!noMoreBranchesToExpand) {
                await this.wait(2000);
                siblingsData = await this.getLeftTreeBranchContents(type, id, recurseDepth);
            }
            data.push({
                id, type,
                name: this.getMatchResultString(match, noMoreBranchesToExpand ? PlanRegexValues.Name : LeftTreeBranchRegexValues.Name) || this.getMatchResultString(match, LeftTreeBranchRegexValues.AnchorName),
                hasPlan: noMoreBranchesToExpand ? noMoreBranchesToExpand : !!this.getMatchResult(match, LeftTreeBranchRegexValues.Link),
                siblings: siblingsData.length > 0 ? siblingsData : undefined,
            });
        }
        return data;
    }
}