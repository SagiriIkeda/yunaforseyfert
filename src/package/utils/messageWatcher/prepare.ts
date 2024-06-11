import { CommandContext, type UsingClient } from "seyfert";
import { YunaMessageWatcherController, type YunaMessageWatcherControllerConfig } from "./watcherController";
import type { MessageWatcherCollectorOptions } from "./messageWatcher";

const controllerKey = Symbol("YunaMessageWatcherController")

type YunaMessageWatcherClient = UsingClient & {
    [controllerKey]?: YunaMessageWatcherController
}

export const prepareWatchers = ({ client, cache }: YunaMessageWatcherControllerConfig) => {

    const self = (client as YunaMessageWatcherClient)
    const inCache = self[controllerKey];
    if (inCache) return;

    const controller = new YunaMessageWatcherController({ client, cache })

    self[controllerKey] = controller;

    return controller;
}

export const getController = (client: UsingClient) => {
    return (client as YunaMessageWatcherClient)[controllerKey]
}


Object.defineProperty(CommandContext.prototype, "createWatcher", {
    value(this: CommandContext, options?: MessageWatcherCollectorOptions) {
        return prepareWatchers({ client: this.client })?.create(this, options)
    }
})

