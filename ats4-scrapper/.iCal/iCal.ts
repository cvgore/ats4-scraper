import iCalEvent from "./Event";

export default class iCal {
    private $events: iCalEvent[];
    private $madeUsing: string;
    private $iCalVersion: string;
    private $calendarType: string;

    public get madeUsing(): string {
        return this.$madeUsing;
    }

    public get iCalVersion(): string {
        return this.$iCalVersion;
    }

    public get calendarType(): string {
        return this.$calendarType;
    }

    public get events(): iCalEvent[] {
        return this.$events;
    }

    constructor(events: iCalEvent[], madeUsing: string, iCalVersion: string, calendarType: string) {
        this.$calendarType = calendarType;
        this.$events = events;
        this.$madeUsing = madeUsing;
        this.$iCalVersion = iCalVersion
    }
}