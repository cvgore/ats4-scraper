import axios, { AxiosInstance } from "axios";
import * as winston from "winston";

interface Department {
    id: number, name: string, courses: Course[] | null, type: number, link: number
};
interface Course {
    id: number, name: string, types: StudyType[]
}
interface StudyType {
    id: number, type: StudyTypes
}
// full-time = stacjonarne
// external = zaoczne
// evening = wieczorowe
type StudyTypes = "full-time" | "external" | "evening";

export default class Scrapper {
    public static readonly version = "0.0.1";
    private readonly departmentRegex: RegExp = /onclick="branch\((\d+),(\d+),(\d+),'([a-z ąćżśłóźńę,-]+)'\);">/gi;
    private readonly leftTreeBranchRegex: RegExp = /<li[^>]*><img src="[^"]*" alt="" id="[^"]*" onclick=" get_left_tree_branch\( '(\d+)', 'img_\d+', 'div_\d+', '(\d+)', '(\d+)' \); " onmouseover="[^"]*" style="[^"]*">[ ]{2}([a-z ąćżśłóźńę,-]+)<div[^>]*><\/div><\/li>/gi;
    private readonly regexGroups = {
        department: {
            type: 1, id: 2, link: 3, name: 4
        },
        leftTreeBranch: {
            id: 1, type: 2, link: 3, name: 4
        }
    };
    private static readonly baseUrl: string = "http://www.plany.ath.bielsko.pl";
    
    private $axios: AxiosInstance;
    private departments: Department[] = [];
    private $logger: winston.Logger;

    private readonly waitNextRequest: number = 5000;

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
        this.$logger.info(`ATH-TT-Scrapper v.${Scrapper.version} starting...`);
        this.$axios = axios.create({
            headers: {
                //'User-Agent': `ATH-TT-Scrapper/${Scrapper.version}/kp055372`
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0'
            }
        });
        this.$logger.info(`Axios HTTP client created`);
        this.getDepartments();
    }

    private studyTypesUrl(type: number, branch: number, link: number): string {
        return `${Scrapper.baseUrl}/left_menu_feed.php?type=${type}&branch=${branch}&link=${link}`;
    }

    private leftTreeBranchUrl(type: number, branch: number, link: number): string {
        return `${Scrapper.baseUrl}/left_menu_feed.php?type=${type}&branch=${branch}&link=${link}&bOne=1`;
    }

    private planUrl(type: number, id: number): string {
        return `${Scrapper.baseUrl}/plan.php?type=${type}&id=${id}&cvsfile=true`;
    }

    private departmentsUrl(): string {
        return `${ Scrapper.baseUrl }/left_menu.php`;
    }

    private getDepartments(): void {
        this.$logger.info(`Fetching departments...`);
        this.$axios.get<string>(this.departmentsUrl()).then((html) => {
            this.$logger.info(`Fetched succesfully`);
            let deps = new RegExp(this.departmentRegex, 'gi')
            let match: RegExpExecArray;
            while (match = deps.exec(html.data)) {
                this.departments.push({
                    id: Number(match[this.regexGroups.department.id]),
                    name: match[this.regexGroups.department.name],
                    courses: [],
                    type: Number(match[this.regexGroups.department.type]),
                    link: Number(match[this.regexGroups.department.link])
                });
            }
            this.$logger.info(`${this.departments.length} departments found`, this.departments.map(v => v.name));
        });
    }

    private getCoursesByDepartment(): void {
        this.$logger.info(`Fetching study types available for all departments...`);
        let func = (async (type: number, branch: number, link: number, departmentId: number): Promise<boolean> => {
            this.$axios.get<string>(this.studyTypesUrl(type, branch, link)).then((html) => {
                this.$logger.info(`Fetched succesfully study types for department '${this.departments[departmentId].name}'`);
                let deps = new RegExp(this.leftTreeBranchRegex, 'gi');
                let match: RegExpExecArray;
                while (match = deps.exec(html.data)) {
                    let department = this.departments[departmentId];
                    let course = department.courses.find((value, i): Course | false => {
                        if (value.name === this.getCourseNormalizedName(match[this.regexGroups.leftTreeBranch.name])) {

                        }
                    });
                }
            });
        });
        this.departments.forEach((val) => {
            val.id
        });
    }

    private getCourseNormalizedName(name: string) {
        return name.replace(/\s{1}\w$/, ``);
    }
}