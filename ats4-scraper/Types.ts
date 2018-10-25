interface ILeftTreeBranch {
    id: number, type: number, link: number
}

export interface Department extends ILeftTreeBranch {
    name: string, courses: Course[] | null,
}

export interface Course extends ILeftTreeBranch {
    name: string, types: StudyType[],
}

export interface StudyType extends ILeftTreeBranch {
    studyType: {
        [key in StudyTypes]?: Degree[]
    },
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
        iCalGrab: 12,
        htmlGrab: 60
    }
}