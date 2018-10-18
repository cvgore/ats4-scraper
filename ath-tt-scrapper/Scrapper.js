"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const winston = require("winston");
;
class Scrapper {
    constructor() {
        this.departmentRegex = /onclick="branch\((\d+),(\d+),(\d+),'([a-z ąćżśłóźńę,-]+)'\);">/gi;
        this.leftTreeBranchRegex = /<li[^>]*><img src="[^"]*" alt="" id="[^"]*" onclick=" get_left_tree_branch\( '(\d+)', 'img_\d+', 'div_\d+', '(\d+)', '(\d+)' \); " onmouseover="[^"]*" style="[^"]*">[ ]{2}([a-z ąćżśłóźńę,-]+)<div[^>]*><\/div><\/li>/gi;
        this.regexGroups = {
            department: {
                type: 1, id: 2, link: 3, name: 4
            },
            leftTreeBranch: {
                id: 1, type: 2, link: 3, name: 4
            }
        };
        this.departments = [];
        this.waitNextRequest = 5000;
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
            let deps = new RegExp(this.departmentRegex, 'gi');
            let match;
            while (match = deps.exec(html.data)) {
                this.departments.push({
                    id: Number(match[this.regexGroups.department.id]),
                    name: match[this.regexGroups.department.name],
                    courses: null
                });
            }
            this.$logger.info(`${this.departments.length} departments found`, this.departments.map(v => v.name));
        });
    }
    getStudyTypesByDepartment(id) {
    }
}
Scrapper.version = "0.0.1";
Scrapper.baseUrl = "http://www.plany.ath.bielsko.pl";
exports.default = Scrapper;
//# sourceMappingURL=Scrapper.js.map