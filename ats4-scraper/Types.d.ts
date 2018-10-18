export interface Department {
    id: number, name: string, courses: Course[] | null, type: number, link: number
}
export interface Course {
    id: number, name: string, types: StudyType[], type: number, link: number
}
export interface StudyType {
    id: number, studyType: StudyTypes, type: number, link: number
}
// full-time = stacjonarne
// external = zaoczne
// evening = wieczorowe
export enum StudyTypes {
    FULL_TIME = "fulltime",
    EXTERNAL = "external",
    EVENING = "evening",
    UNKNOWN = "?"
}

export interface ScraperConfig {
    baseUrl: string,
    outputPath: string,
    requestsPerMinute?: number
}