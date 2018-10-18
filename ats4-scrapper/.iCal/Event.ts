import iCalBaseComponent from "./iCalBaseComponent";
import LogicError from "./LogicError";

export default class Event extends iCalBaseComponent {

    private $starts: Date;
    private $ends: Date;
    private $summary: string;

    public static get component(): string {
        return "VEVENT";
    }

    public get starts(): Date {
        return this.$starts;
    }

    public get ends(): Date {
        return this.$ends;
    }

    public get summary(): string {
        return this.$summary;
    }

    constructor(start: Date, end: Date, summary: string) {
        super();
        if (start.getTime() > end.getTime()) {
            throw new LogicError("Event cannot start after its end!");
        }
        this.$starts = start;
        this.$ends = start;
        this.$summary = summary;
    }

}