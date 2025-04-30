import { debounce } from "../Common";

type EventCondition = {
    [key: string]: boolean;
};
type MultipleEventHandlerFunction = () => void;
type ConditionCallback = {
    events: EventCondition,
    func: MultipleEventHandlerFunction,
};

function setGlobalClickCondition() {
    MultipleEventHandler.setEvent("globalClick");
}

export class MultipleEventHandler {
    events: Set<string> = new Set<string>();
    callbacks: ConditionCallback[] = [];

    private constructor() {}

    private static instance: MultipleEventHandler = new MultipleEventHandler();

    private executeCallbacks() {
        debounce("ClickHandler.executeCallbacks", () => {
            this.callbacks.forEach(callback => {
                for (let condition in callback.events) {
                    if (callback.events[condition]) {
                        if (!this.events.has(condition)) {
                            return;
                        }
                    } else {
                        if (this.events.has(condition)) {
                            return;
                        }
                    }
                }
                callback.func();
            });
            this.events.clear();
        }, 1);
    }

    public static addListener(events: EventCondition, func: MultipleEventHandlerFunction) {
        this.instance.callbacks.push({ events: events, func });
    }

    public static removeListener(callback: MultipleEventHandlerFunction) {
        this.instance.callbacks = this.instance.callbacks.filter(eventCondition => eventCondition.func !== callback);
    }

    public static addGlobalClickListener() {
        document.addEventListener("click", setGlobalClickCondition);
    }

    public static removeGlobalClickListener() {
        document.removeEventListener("click", setGlobalClickCondition);
    }

    public static setEvent(event: string) {
        this.instance.events.add(event);
        this.instance.executeCallbacks();
    }
}