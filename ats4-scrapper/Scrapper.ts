import axios, { AxiosInstance } from "axios";
import * as winston from "winston";
import { writeFileSync } from "fs";

interface Department {
    id: number, name: string, courses: Course[] | null, type: number, link: number
};
interface Course {
    id: number, name: string, types: StudyType[], type: number, link: number
}
interface StudyType {
    id: number, studyType: StudyTypes, type: number, link: number
}
// full-time = stacjonarne
// external = zaoczne
// evening = wieczorowe
enum StudyTypes {
    FULL_TIME = "fulltime",
    EXTERNAL = "external",
    EVENING = "evening",
    UNKNOWN = "?"
}

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
    Name
}

export default class Scrapper {
    public static readonly version = "0.0.1";
    private readonly departmentRegex: RegExp = /onclick="branch\((\d+),(\d+),(\d+),'([a-z ąćżśłóźńę,-]+)'\);">/gi;
    private readonly leftTreeBranchRegex: RegExp = /<li[^>]*><img\s+src='[^']*' alt='[^']*' id='[^']*'\s+onclick=" get_left_tree_branch\( '(\d+)', 'img_\d+', 'div_\d+', '(\d+)', '(\d+)' \); "\s+onmouseover="[^"]*"[^>]*>[ ]{2}([a-z ąćżśłóźńę,-]+)<div[^>]*><\/div><\/li>/gi;
    private static readonly baseUrl: string = "http://www.plany.ath.bielsko.pl";
    
    private $axios: AxiosInstance;
    private departments: Department[] = [];
    private $logger: winston.Logger;

    constructor() {
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
        this.$logger.info(`ATS4-Scrapper v.${Scrapper.version} starting...`);
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

    private studyTypesUrl(type: number, branch: number, link: number): string {
        return `${Scrapper.baseUrl}/left_menu_feed.php?type=${type}&branch=${branch}&link=${link}`;
    }

    private testConnectionBefore(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.$axios.get<string>(Scrapper.baseUrl).then((html) => {
                resolve();
            }).catch(err => reject(err));
        });
    }

    private leftTreeBranchUrl(type: number, branch: number, link: number): string {
        return `${Scrapper.baseUrl}/left_menu_feed.php?type=${type}&branch=${branch}&link=${link}&bOne=1`;
    }

    private planUrl(type: number, id: number): string {
        return `${Scrapper.baseUrl}/plan.php?type=${type}&id=${id}&cvsfile=true`;
    }

    private departmentsUrl(): string {
        return `${Scrapper.baseUrl}/left_menu.php`;
    }
    private getDepartments(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.$logger.info(`Fetching departments...`);
            this.$axios.get<string>(this.departmentsUrl()).then((html) => {
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
                this.getCourses().then(() => {
                    resolve();
                });
            });
        })
       
    }

    private getCourses(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.$logger.info(`Fetching study types available for all departments...`);
            //this.departments.forEach((val, i) => {
            //    this.departmentGetAll(val.type, val.id, val.link, i);
            //});
            this.departmentGetAll(this.departments[0].type, this.departments[0].id, this.departments[0].link, 0).then(() => {
                resolve();
            });
        });
    }

    private departmentGetAll(type: number, branch: number, link: number, departmentId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            let fetchedStudyTypesCount: number = 0;
            let processedStudyTypesCount: number = 0;
            this.$axios.post<string>(this.studyTypesUrl(type, branch, link)).then((html) => {
                this.$logger.info(`Fetched succesfully study types for department '${this.departments[departmentId].name}'`);
                let fetchedStudyTypes = new RegExp(this.leftTreeBranchRegex, 'gi');
                let studyTypesMatch: RegExpExecArray;
                while (studyTypesMatch = fetchedStudyTypes.exec(html.data)) {
                    fetchedStudyTypesCount++;
                    this.$logger.info(`Fetching courses for '${studyTypesMatch[LeftTreeBranchValues.Name]}' study types...`);
                    this.studyTypeGetCourses(studyTypesMatch, departmentId).then(() => {
                        if (fetchedStudyTypesCount <= ++processedStudyTypesCount) {
                            resolve();
                        }
                    });
                }
            });
        });
    };

    private studyTypeGetCourses(studyTypesMatch: RegExpExecArray, departmentId: number): Promise<void> {
        return new Promise((resolve, reject) => {
            let fetchedCoursesCount: number = 0;
            this.$axios.post<string>(this.leftTreeBranchUrl(Number(studyTypesMatch[LeftTreeBranchValues.Type]), Number(studyTypesMatch[LeftTreeBranchValues.Id]), Number(studyTypesMatch[LeftTreeBranchValues.Link]))).then((html) => {
                this.$logger.info(`Fetched succesfully course for study type '${studyTypesMatch[LeftTreeBranchValues.Name]}' for department '${this.departments[departmentId].name}'`);
                let fetchedCourses = new RegExp(this.leftTreeBranchRegex, 'gi');
                let courseMatch: RegExpExecArray;
                let department = this.departments[departmentId];
                while (courseMatch = fetchedCourses.exec(html.data)) {
                    fetchedCoursesCount++;
                    let course = this.departments[departmentId].courses.find((value, i): boolean => {
                        if (value.name === this.getCourseNormalizedName(courseMatch[LeftTreeBranchValues.Name])) {
                            return true;
                        }
                    });
                    if (typeof course === "undefined") {
                        department.courses.push({
                            id: Number(courseMatch[LeftTreeBranchValues.Id]),
                            name: this.getCourseNormalizedName(courseMatch[LeftTreeBranchValues.Name]),
                            type: Number(courseMatch[LeftTreeBranchValues.Type]),
                            link: Number(courseMatch[LeftTreeBranchValues.Link]),
                            types: [{
                                id: Number(studyTypesMatch[LeftTreeBranchValues.Id]),
                                studyType: this.getStudyTypeFromRegularName(studyTypesMatch[LeftTreeBranchValues.Name]),
                                link: Number(studyTypesMatch[LeftTreeBranchValues.Link]),
                                type: Number(studyTypesMatch[LeftTreeBranchValues.Type])
                            }]
                        })
                    } else {
                        course.types.push({
                            id: Number(studyTypesMatch[LeftTreeBranchValues.Id]),
                            studyType: this.getStudyTypeFromRegularName(studyTypesMatch[LeftTreeBranchValues.Name]),
                            link: Number(studyTypesMatch[LeftTreeBranchValues.Link]),
                            type: Number(studyTypesMatch[LeftTreeBranchValues.Type])
                        });
                    }
                }
                this.$logger.info(`Fetched succesfully ${fetchedCoursesCount} course(s) for '${this.getStudyTypeFromRegularName(studyTypesMatch[LeftTreeBranchValues.Name])} studies' for department '${this.departments[departmentId].name}'`);
                resolve();
            });
        });
    }


    private getCourseNormalizedName(name: string): string {
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
}