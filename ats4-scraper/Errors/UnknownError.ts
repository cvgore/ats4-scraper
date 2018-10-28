export default abstract class UnknownError extends Error {
    constructor(what?: string) {
        super();
        this.name = this.constructor.name;
        this.message = what;
    }
}