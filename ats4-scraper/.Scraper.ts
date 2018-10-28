import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as winston from "winston";
import { writeFileSync } from "fs";
import { Department, Course, StudyTypes, ScraperConfig, ClassesTypes, ILeftTreeBranch, Semester, Degree, ExerciseGroup } from "./Types";
import RegexMatchFailed from "./Errors/RegexMatchFailed";

enum DepartmentRegexValues {
    Type = 1,
    Id,
    Link,
    Name
}

enum LeftTreeBranchValues {
    Id = 1,
    Type,
    Link,
    PlanType,
    AnchorName,
    Name
}

export default class Scraper {
    public static readonly version = "0.1.0";
    private readonly departmentRegex: RegExp = /onclick="branch\((\d+),(\d+),(\d+),'([a-z ąćżśłóźńę,-]+)'\);">/gi;
    private readonly planRegex: RegExp = /<li><img src="[^"]*" alt="" \/> <a href="plan\.php\?type=(\d+)&amp;id=(\d+)" target="[^"]*">([0-9a-z ąćżśłóźńę,\/-]+)<\/a><\/li>/gi;
    private readonly leftTreeBranchRegex: RegExp = /<li[^>]*><img\s+src='[^']*'\s+alt='[^']*'\s+id='[^']*'\s+onclick="\s+get_left_tree_branch\(\s+'(\d+)',\s+'img_\d+',\s+'div_\d+',\s+'(\d+)',\s+'?(\d+)'\s+\); "\s+onmouseover="[^"]*"[^>]*>\s+(?:<a\s+href="plan\.php\?type=(\d+)&amp;id=\d+"[^>]*>\s*([a-z ąćżśłóźńę,\/-]+)<\/a>|\s*([a-z ąćżśłóźńę,-\/]+))<div[^>]*><\/div><\/li>/gi;
    private baseUrl: string;
    
    private $axios: AxiosInstance;
    private departments: Department[] = [];
    private $logger: winston.Logger;

    constructor(config: ScraperConfig) {
        this.baseUrl = config.baseUrl;
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
        this.$logger.info(`ATS4-Scraper v.${Scraper.version} starting...`);
        this.$axios = axios.create({
            headers: {
                //'User-Agent': `ATS4-Scrapper/${Scrapper.version} (https://github.com/cvgore/ats4-scrapper)`
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0'
            }
        });
        this.$logger.info(`Axios HTTP client created`);
        this.testConnectionBefore().then(() => {
            this.getDepartments().then(() => {
                this.$logger.info(`Writing data to file`);
                writeFileSync("data.json", JSON.stringify(this.departments));
            });
        }).catch((err) => {
            this.$logger.error(`There was an error, while trying to connect to website`);
            this.$logger.error(err);
        });
        
    }

    private async wait(ms: number): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            setTimeout(() => {
                resolve(true);
            }, ms);
        });
    }

    private studyTypesUrl(type: number, branch: number, link: number): string {
        return `${this.baseUrl}/left_menu_feed.php?type=${type}&branch=${branch}&link=${link}`;
    }

    private async testConnectionBefore(): Promise<boolean> {
        let html: AxiosResponse<string> = await this.$axios.get<string>(this.baseUrl);
        return html.data.length > 0;
    }

    private leftTreeBranchUrl(type: number, branch: number, link: number): string {
        return `${this.baseUrl}/left_menu_feed.php?type=${type}&branch=${branch}&link=${link}&bOne=1`;
    }

    private planUrl(type: number, id: number): string {
        return `${this.baseUrl}/plan.php?type=${type}&id=${id}&cvsfile=true`;
    }

    private departmentsUrl(): string {
        return `${this.baseUrl}/left_menu.php`;
    }
    private async getDepartments(): Promise<void> {
        this.$logger.info(`Fetching departments...`);
        let html: AxiosResponse<string> = await this.$axios.get<string>(this.departmentsUrl());
        this.$logger.info(`Fetched succesfully`);
        let fetchedDepartments = new RegExp(this.departmentRegex, 'gi')
        var match: RegExpExecArray;
        while (match = fetchedDepartments.exec(html.data)) {
            this.departments.push({
                id: Number(match[DepartmentRegexValues.Id]),
                name: match[DepartmentRegexValues.Name],
                courses: [],
                type: Number(match[DepartmentRegexValues.Type]),
                link: Number(match[DepartmentRegexValues.Link])
            });
        }
        this.$logger.info(`${this.departments.length} departments found`, this.departments.map(v => v.name));
        this.$logger.info(`Awaiting 5s before next request`);
        await this.wait(5000);
        await this.getCourses();
    }

    private async getCourses(): Promise<void> {
        this.$logger.info(`Fetching study types available for all departments...`);
        //this.departments.forEach((val, i) => {
        //    this.departmentGetAll(val.type, val.id, val.link, i);
        //});
        await this.departmentGetAll(this.departments[0].type, this.departments[0].id, this.departments[0].link, 0);
    }

    private async getGroups(): Promise<void> {
        this.$logger.info(`Fetching all groups...`);
        await this.wait(1000);
        for (let department of this.departments) {
            for (let course of department.courses) {
                for (let studyType in course.studyTypes) {
                    for (let semester of (course.studyTypes[studyType] as Degree).semesters) {
                        semester.classGroups = [];
                        semester.classGroups = await this.getLeftTreeBranchContents(semester.type, semester.id, semester.link) as ExerciseGroup[];
                        return;
                    }
                }
            }
        }
    }

    private async departmentGetAll(type: number, branch: number, link: number, departmentId: number): Promise<boolean> {
        let html: AxiosResponse<string> = await this.$axios.post<string>(this.studyTypesUrl(type, branch, link));
        this.$logger.info(`Fetched succesfully study types for department '${this.departments[departmentId].name}'`);
        let fetchedStudyTypes = new RegExp(this.leftTreeBranchRegex, 'gi');
        let studyTypesMatch: RegExpExecArray;
        while (studyTypesMatch = fetchedStudyTypes.exec(html.data)) {
            this.$logger.info(`Fetching courses for '${studyTypesMatch[LeftTreeBranchValues.Name]}' study types...`);
            this.$logger.info(`Awaiting 1s before next request`);
            await this.wait(1000);
            await this.studyTypeGetCourses(studyTypesMatch, departmentId);
        }
        await this.getGroups();
        return true;
    };

    private async studyTypeGetCourses(studyTypesMatch: RegExpExecArray, departmentId: number): Promise<boolean> {
        let html: AxiosResponse<string> = await this.$axios.post<string>(this.leftTreeBranchUrl(Number(studyTypesMatch[LeftTreeBranchValues.Type]), Number(studyTypesMatch[LeftTreeBranchValues.Id]), Number(studyTypesMatch[LeftTreeBranchValues.Link])));
        this.$logger.info(`Fetched succesfully course for study type '${studyTypesMatch[LeftTreeBranchValues.Name]}' for department '${this.departments[departmentId].name}'`);
        let fetchedCourses = new RegExp(this.leftTreeBranchRegex, 'gi');
        let courseMatch: RegExpExecArray;
        let department = this.departments[departmentId];
        while (courseMatch = fetchedCourses.exec(html.data)) {
            let course = this.departments[departmentId].courses.find((value, i): boolean => {
                if (value.name === this.getCourseNormalizedName(courseMatch[LeftTreeBranchValues.Name])) {
                    return true;
                }
            });

            let id: number = Number(courseMatch[LeftTreeBranchValues.Id]);
            let link: number = Number(courseMatch[LeftTreeBranchValues.Link]);
            let type: number = Number(courseMatch[LeftTreeBranchValues.Type]);
        
            if (typeof course === "undefined") {
                department.courses.push({
                    id, link, type,
                    name: this.getCourseNormalizedName(courseMatch[LeftTreeBranchValues.Name]),
                    studyTypes: new Map([this.getStudyTypeFromRegularName(studyTypesMatch[LeftTreeBranchValues.Name]) as StudyTypes, [{
                        id, link, type,
                        semesters: await this.getLeftTreeBranchContents(type, id, link) as Semester[]
                    }]])
                });
            } else {
                if (typeof course.studyTypes[this.getStudyTypeFromRegularName(studyTypesMatch[LeftTreeBranchValues.Name])] === "undefined") {
                    course.studyTypes[this.getStudyTypeFromRegularName(studyTypesMatch[LeftTreeBranchValues.Name])] = [];
                }
                course.studyTypes[this.getStudyTypeFromRegularName(studyTypesMatch[LeftTreeBranchValues.Name])].push({
                    id, link, type,
                    semesters: await this.getLeftTreeBranchContents(type, id, link) as Semester[]
                });
            }
        }
        this.$logger.info(`Fetched succesfully course(s) for '${this.getStudyTypeFromRegularName(studyTypesMatch[LeftTreeBranchValues.Name])} studies' for department '${this.departments[departmentId].name}'`);
        return true;
    }
    private async getLeftTreeBranchContents(type: number, branch: number, link: number, nameFmtCb?: (val: string) => string): Promise<ILeftTreeBranch[]> {
        this.$logger.info(`Request - ${this.leftTreeBranchUrl(type, branch, link)}`);
        if (typeof nameFmtCb === 'undefined') {
            nameFmtCb = val => val;
        }
        let html: AxiosResponse<string> = await this.$axios.post<string>(this.leftTreeBranchUrl(type, branch, link));
        let leftTreeBranchFound = new RegExp(this.leftTreeBranchRegex, 'gi');
        if (!leftTreeBranchFound.test(html.data)) {
            return [];
            //throw new RegexMatchFailed();
        }
        let matches: RegExpExecArray;
        let ltb: ILeftTreeBranch[] = [];
        while (matches = leftTreeBranchFound.exec(html.data)) {
            ltb.push({
                id: Number(matches[LeftTreeBranchValues.Id]),
                link: Number(matches[LeftTreeBranchValues.Link]),
                type: Number(matches[LeftTreeBranchValues.Type]),
                name: nameFmtCb(matches[LeftTreeBranchValues.Name])
            });
        }
        return ltb;
    }


    private getCourseNormalizedName(name: string): string {
        if (!name) return '';
        return name.replace(/\s[A-Z]{1,2}$/, ``).trim();
    }

    private getStudyTypeFromRegularName(str: string): StudyTypes {
        switch (str) {
            case "Niestacjonarne Wieczorowe":
                return StudyTypes.EVENING;
            case "Niestacjonarne Zaoczne":
                return StudyTypes.EXTERNAL;
            case "Stacjonarne":
                return StudyTypes.FULL_TIME;
            default:
                this.$logger.warn(`Unknown '${str}' study type regular name`);
                return StudyTypes.UNKNOWN;
        }
    }

    private getClassesTypeFromRegularName(str: string): ClassesTypes {
        switch (str) {
            case "konw":
                return ClassesTypes.CONSERVATOIRE;
            case "lab":
                return ClassesTypes.LABORATORY;
            case "ćw":
                return ClassesTypes.EXERCISE;
            case "proj":
                return ClassesTypes.PROJECT;
            case "wyk":
                return ClassesTypes.LECTURE;
            default:
                this.$logger.warn(`Unknown '${str}' classes type regular name`);
                return ClassesTypes.UNKNOWN;
        }
    }
}