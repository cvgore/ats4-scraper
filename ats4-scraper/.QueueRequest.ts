import axios, { AxiosInstance } from "axios";

export default class QueueRequest {
    private $axios: AxiosInstance;
    constructor(axiosInstance: AxiosInstance, reqsPerMinute: number) {
        this.$axios = axiosInstance;
    }
}