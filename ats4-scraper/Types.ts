import { Script } from "vm";

export interface ILeftTreeBranch {
    id: number, type: number, name?: string
}

export interface Department extends ILeftTreeBranch {
    name: string, courses: Course[] | null,
}

export interface Course extends ILeftTreeBranch {
    name: string, studyTypes: Map<StudyTypes, Degree[]>,
}

export interface Semester extends ILeftTreeBranch {
    classGroups: ExerciseGroup[]
}

export interface ExerciseGroup extends ILeftTreeBranch {
    labGroups: LabGroup[]
}

export interface LabGroup extends ILeftTreeBranch {
    name: string
}

export interface Degree extends ILeftTreeBranch {
    semesters: Semester[]
}

// fulltime = stacjonarne
// external = zaoczne
// evening = wieczorowe
export enum StudyTypes {
    FULL_TIME = "fulltime",
    EXTERNAL = "external",
    EVENING = "evening",
    UNKNOWN = "?"
}

// conservatoire = konserwatorium
// lecture = wykład
// laboratory = laboratorium
// project = projekt
// exercise = ćwiczenia
export enum ClassesTypes {
    CONSERVATOIRE = "conservatoire",
    LECTURE = "lecture",
    LABORATORY = "laboratory",
    PROJECT = "project",
    EXERCISE = "exercise",
    UNKNOWN = "?"
}

export interface ScraperConfig {
    baseUrl: string,
    outputPath: string,
    requestsPerMinute?: {
        iCalGrab: number, // 12
        htmlGrab: number // 60
    },
    initialDate: number
}

export interface PlanData {
    name: string,
    starts: Date,
    lasts: number // ms
}

export interface RecurseScraperConfig extends ScraperConfig {
    maxRecursionDepth: number // 6
}

export interface RecurseScrappedData extends ILeftTreeBranch {
    siblings?: RecurseScrappedData[],
    hasPlan: boolean
}

export interface RecurseRootData {
    siblings: RecurseScrappedData[],
    name: string,
}