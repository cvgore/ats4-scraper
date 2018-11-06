import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import * as winston from "winston";
import { RecurseRootData, RecurseScrappedData } from "../Types";
import Plan from "./Plan";
import PlanFetchFailedError from "../Errors/PlanFetchFailedError";
import { writeFileSync } from "fs";

export default class PlanScrapper {
    private $axios: AxiosInstance;
    private scrappedData: RecurseRootData[] = [];
    private $logger: winston.Logger;
    private planData: Plan[] = [];
    private _baseUrl: string;
    private currentWeekNo: number;

    constructor(data: RecurseRootData[], axiosInstance: AxiosInstance, winstonInstance: winston.Logger, baseUrl: string, weekNo: number) {
        this.scrappedData = data;
        this.$axios = axiosInstance;
        this.$logger = winstonInstance;
        this._baseUrl = baseUrl;
        this.currentWeekNo = weekNo;
    }

    private baseUrl(url: string): string {
        return `${this._baseUrl}/${url}`;
    }

    private recurseForEach = (el: RecurseScrappedData | RecurseRootData) => {
        if (el.siblings) {
            return el.siblings.forEach(this.recurseForEach);
        }
        if (el.hasOwnProperty("hasPlan") && (el as RecurseScrappedData).hasPlan === true) {
            this.planData.push(new Plan((el as RecurseScrappedData).type, (el as RecurseScrappedData).id, el.name, this.currentWeekNo));
        }
    }

    public async run() {
        this.scrappedData.forEach(this.recurseForEach);
        if (!await this.everyAsync(this.planData, this.fetchForAll, this)) {
            throw new PlanFetchFailedError(`Couldn't fetch all plans successfully`);
        }
        this.$logger.info(`Successfully fetched all plans data's`);
    }

    private async fetchForAll(plan: Plan): Promise<boolean> {
        let iCalData: AxiosResponse<string>;
        try {
            this.$logger.info(`Fetching plan - ${this.baseUrl(plan.url)}`);
            iCalData = await this.$axios.get<string>(this.baseUrl(plan.url));
        } catch (ex) {
            this.$logger.warn(`An error occured while trying to get plan ${plan.id}`, ex);
            return false;
        }
        writeFileSync(`plans/${plan.id}.ics`, iCalData.data);
        return true;
    }

    private async everyAsync<T>(array: T[], callback: (value:T, index: number, array: T[]) => Promise<boolean>, thisArg?: any): Promise<boolean> {
        for (let i = 0; i < array.length; i++) {
            if (!await callback.apply(thisArg || this, [array[i], i, array]))
                return false;
        }
        return true;
    }

}