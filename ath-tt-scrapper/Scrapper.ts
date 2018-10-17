import axios, { AxiosInstance } from "axios";

interface Department {
    id: number, name: string, courses: Course[]
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
    private readonly departmentRegex = /onclick="branch\((\d+),(\d+),(\d+),'([a-z ąćżśłóźńę,-]+)'\);">/gi;
    private readonly leftTreeBranchRegex = /<li[^>]*><img src="[^"]*" alt="" id="[^"]*" onclick=" get_left_tree_branch\( '(\d+)', 'img_\d+', 'div_\d+', '(\d+)', '(\d+)' \); " onmouseover="[^"]*" style="[^"]*">[ ]{2}([a-z ąćżśłóźńę,-]+)<div[^>]*><\/div><\/li>/gi;
    private readonly regexGroups = {
        department: {
            type: 1, id: 2, link: 3, name: 4
        },
        leftTreeBranch: {
            id: 1, type: 2, link: 3, name: 4
        }
    };
    private static readonly baseUrl = "http://www.plany.ath.bielsko.pl";
    private static readonly departmentsUrl = "left_menu.php";
    
    private $axios: AxiosInstance;
    private departments: Department[];

    constructor() {
        this.$axios = axios.create({
            headers: {
                'User-Agent': `ATH-TT-Scrapper/${Scrapper.version}`
            }
        });
    }

    private studyTypesUrl(type: number, branch: number, link: number): string {
        return `left_menu_feed.php?type=${type}&branch=${branch}&link=${link}`;
    }

    private leftTreeBranchUrl(type: number, branch: number, link: number): string {
        return `left_menu_feed.php?type=${type}&branch=${branch}&link=${link}&bOne=1`;
    }

    private planUrl(type: number, id: number) {
        return `${Scrapper.baseUrl}/plan.php?type=${type}&id=${id}&cvsfile=true`;
    }
}