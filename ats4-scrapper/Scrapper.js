"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const winston = require("winston");
const fs_1 = require("fs");
;
// full-time = stacjonarne
// external = zaoczne
// evening = wieczorowe
var StudyTypes;
(function (StudyTypes) {
    StudyTypes["FULL_TIME"] = "full-time";
    StudyTypes["EXTERNAL"] = "external";
    StudyTypes["EVENING"] = "evening";
    StudyTypes["UNKNOWN"] = "?";
})(StudyTypes || (StudyTypes = {}));
var DepartmentRegexValues;
(function (DepartmentRegexValues) {
    DepartmentRegexValues[DepartmentRegexValues["Type"] = 1] = "Type";
    DepartmentRegexValues[DepartmentRegexValues["Id"] = 2] = "Id";
    DepartmentRegexValues[DepartmentRegexValues["Link"] = 3] = "Link";
    DepartmentRegexValues[DepartmentRegexValues["Name"] = 4] = "Name";
})(DepartmentRegexValues || (DepartmentRegexValues = {}));
var LeftTreeBranchValues;
(function (LeftTreeBranchValues) {
    LeftTreeBranchValues[LeftTreeBranchValues["Id"] = 1] = "Id";
    LeftTreeBranchValues[LeftTreeBranchValues["Type"] = 2] = "Type";
    LeftTreeBranchValues[LeftTreeBranchValues["Link"] = 3] = "Link";
    LeftTreeBranchValues[LeftTreeBranchValues["Name"] = 4] = "Name";
})(LeftTreeBranchValues || (LeftTreeBranchValues = {}));
class Scrapper {
    constructor() {
        this.departmentRegex = /onclick="branch\((\d+),(\d+),(\d+),'([a-z ąćżśłóźńę,-]+)'\);">/gi;
        this.leftTreeBranchRegex = /<li[^>]*><img\s+src='[^']*' alt='[^']*' id='[^']*'\s+onclick=" get_left_tree_branch\( '(\d+)', 'img_\d+', 'div_\d+', '(\d+)', '(\d+)' \); "\s+onmouseover="[^"]*"[^>]*>[ ]{2}([a-z ąćżśłóźńę,-]+)<div[^>]*><\/div><\/li>/gi;
        this.departments = [];
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
        this.$axios = axios_1.default.create({
            headers: {
                //'User-Agent': `ATH-TT-Scrapper/${Scrapper.version}/kp055372`
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0'
            }
        });
        this.$logger.info(`Axios HTTP client created`);
        this.getDepartments();
    }
    studyTypesUrl(type, branch, link) {
        return `${Scrapper.baseUrl}/left_menu_feed.php?type=${type}&branch=${branch}&link=${link}`;
    }
    leftTreeBranchUrl(type, branch, link) {
        return `${Scrapper.baseUrl}/left_menu_feed.php?type=${type}&branch=${branch}&link=${link}&bOne=1`;
    }
    planUrl(type, id) {
        return `${Scrapper.baseUrl}/plan.php?type=${type}&id=${id}&cvsfile=true`;
    }
    departmentsUrl() {
        return `${Scrapper.baseUrl}/left_menu.php`;
    }
    getDepartments() {
        this.$logger.info(`Fetching departments...`);
        this.$axios.get(this.departmentsUrl()).then((html) => {
            this.$logger.info(`Fetched succesfully`);
            let fetchedDepartments = new RegExp(this.departmentRegex, 'gi');
            var match;
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
                this.$logger.info(`Writing data to file`);
                fs_1.writeFileSync("data.json", JSON.stringify(this.departments));
            });
        });
    }
    getCourses() {
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
    departmentGetAll(type, branch, link, departmentId) {
        return new Promise((resolve, reject) => {
            let fetchedStudyTypesCount = 0;
            let processedStudyTypesCount = 0;
            this.$axios.post(this.studyTypesUrl(type, branch, link)).then((html) => {
                this.$logger.info(`Fetched succesfully study types for department '${this.departments[departmentId].name}'`);
                let fetchedStudyTypes = new RegExp(this.leftTreeBranchRegex, 'gi');
                let studyTypesMatch;
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
    }
    ;
    studyTypeGetCourses(studyTypesMatch, departmentId) {
        return new Promise((resolve, reject) => {
            let fetchedCoursesCount = 0;
            this.$axios.post(this.leftTreeBranchUrl(Number(studyTypesMatch[LeftTreeBranchValues.Type]), Number(studyTypesMatch[LeftTreeBranchValues.Id]), Number(studyTypesMatch[LeftTreeBranchValues.Link]))).then((html) => {
                this.$logger.info(`Fetched succesfully course for study type '${studyTypesMatch[LeftTreeBranchValues.Name]}' for department '${this.departments[departmentId].name}'`);
                let fetchedCourses = new RegExp(this.leftTreeBranchRegex, 'gi');
                let courseMatch;
                let department = this.departments[departmentId];
                while (courseMatch = fetchedCourses.exec(html.data)) {
                    fetchedCoursesCount++;
                    let course = this.departments[departmentId].courses.find((value, i) => {
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
                        });
                    }
                    else {
                        course.types.push({
                            id: Number(studyTypesMatch[LeftTreeBranchValues.Id]),
                            studyType: this.getStudyTypeFromRegularName(studyTypesMatch[LeftTreeBranchValues.Name]),
                            link: Number(studyTypesMatch[LeftTreeBranchValues.Link]),
                            type: Number(studyTypesMatch[LeftTreeBranchValues.Type])
                        });
                    }
                }
                this.$logger.info(`Fetched succesfully ${fetchedCoursesCount} course(s) for department '${this.departments[departmentId].name}'`, this.departments[departmentId].courses);
                resolve();
            });
        });
    }
    getCourseNormalizedName(name) {
        return name.replace(/\s[A-Z]{1,2}$/, ``).trim();
    }
    getStudyTypeFromRegularName(str) {
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
Scrapper.version = "0.0.1";
Scrapper.baseUrl = "http://www.plany.ath.bielsko.pl";
exports.default = Scrapper;
//# sourceMappingURL=Scrapper.js.map