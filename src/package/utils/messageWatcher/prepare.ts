import type { OptionsRecord, UsingClient } from "seyfert";
import type { MessageWatcherCollectorOptions } from "./WatcherCollector";
import { YunaMessageWatcherController, type YunaMessageWatcherControllerConfig, type watcherCreateData } from "./WatcherController";

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

export const createWatcher = <const O extends OptionsRecord | undefined = undefined, const C extends watcherCreateData = watcherCreateData>(
    ctx: C,
    options?: MessageWatcherCollectorOptions,
) => {
    return prepareWatchers({ client: ctx.client }).create<O, C>(ctx, options);
};
