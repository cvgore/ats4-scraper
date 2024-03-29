﻿import { ILeftTreeBranch, PlanData } from "./Types";
import IcsToJson from "./Parsers/IcsToJson";
import ics from "icsparser";

export default class Plan {
    private _id: number;
    private _name: string;
    private _type: number;
    private _weekNo: number;
    private _path: number;
    private planUrl(): string {
        return `plan.php?type=${this.type}&id=${this.id}&cvsfile=true&w=${this._weekNo}`;
    }
    constructor(type: number, id: number, name: string, weekNo: number) {
        this._id = id;
        this._name = name;
        this._type = type;
        this._weekNo = weekNo;
    }

    public get url(): string {
        return this.planUrl();
    }

    public get id(): number {
        return this._id;
    }

    public get name(): string {
        return this._name;
    }

    public get type(): number {
        return this._type;
    }

    public async parse(): Promise<PlanData[]> {
        let data = new IcsToJson(`plans/`, `plans/`);
        return await data.parse(this);
    }
}