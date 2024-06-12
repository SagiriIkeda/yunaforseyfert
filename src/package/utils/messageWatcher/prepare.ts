import type { CommandContext, UsingClient } from "seyfert";
import type { MessageWatcherCollectorOptions } from "./messageWatcher";
import { YunaMessageWatcherController, type YunaMessageWatcherControllerConfig } from "./watcherController";

const controllerKey = Symbol("YunaMessageWatcherController");

type YunaMessageWatcherClient = UsingClient & {
    [controllerKey]?: YunaMessageWatcherController;
};

export const prepareWatchers = ({ client, cache }: YunaMessageWatcherControllerConfig) => {
    const self = client as YunaMessageWatcherClient;
    const inCache = self[controllerKey];
    if (inCache) return inCache;

    const controller = new YunaMessageWatcherController({ client, cache });

    self[controllerKey] = controller;

    return controller;
};

export const getController = (client: UsingClient) => {
    return (client as YunaMessageWatcherClient)[controllerKey];
};

export const createWatcher = <C extends CommandContext>(ctx: C, options?: MessageWatcherCollectorOptions) => {
    return prepareWatchers({ client: ctx.client }).create<C>(ctx, options);
};
