import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import * as winston from "winston";
import { RecurseRootData, RecurseScrappedData } from "../Types";
import Plan from "../Plan";
import PlanFetchFailedError from "../Errors/PlanFetchFailedError";
import { writeFileSync } from "fs";

export default class PlanScraper {
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

    private async wait(ms: number): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.$logger.info(`Waiting ${ms} ms...`);
            setTimeout(() => {
                resolve(true);
            }, ms);
        });
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
        if (!await this.everyAsyncWaitable(this.planData, this.fetchForAll, this)) {
            throw new PlanFetchFailedError(`Couldn't fetch all plans successfully`);
        }
        this.$logger.info(`Successfully fetched all plans data's`);
    }

    private async fetchForAll(plan: Plan): Promise<boolean> {
        try {
            this.$logger.info(`Fetching plan - ${this.baseUrl(plan.url)}`);
            let iCalData: AxiosResponse<string> = await this.$axios.get<string>(this.baseUrl(plan.url));
            writeFileSync(`plans/${plan.id}.ics`, iCalData.data);
            return true;
        } catch (ex) {
            this.$logger.error(`An error occured while trying to get plan ${plan.id}`, ex);
            return false;
        }
    }

    private async everyAsyncWaitable<T>(array: T[], callback: (value:T, index: number, array: T[]) => Promise<boolean>, thisArg?: any, waitTimeMs: number = 2000): Promise<boolean> {
        for (let i = 0; i < array.length; i++) {
            if (i > 0 && waitTimeMs > 0) {
                await this.wait(waitTimeMs);
            }
            if (!await callback.apply(thisArg || this, [array[i], i, array]))
                return false;
        }
        return true;
    }

}