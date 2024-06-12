import type { OptionsRecord, UsingClient } from "seyfert";
import type { MessageWatcherCollectorOptions } from "./messageWatcher";
import { YunaMessageWatcherController, type NeverOptions, type YunaMessageWatcherControllerConfig, type createT } from "./watcherController";

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



export const createWatcher = <const T extends OptionsRecord = NeverOptions, const C extends createT = createT>(ctx: C, options?: MessageWatcherCollectorOptions) => {

    return prepareWatchers({ client: ctx.client }).create<T, C>(ctx, options);
};
