import type { OptionsRecord } from "seyfert";
import type { BaseClient } from "seyfert/lib/client/base";
import { type AvailableClients, Keys } from "../../things";
import { type WatcherCreateData, WatchersController, type YunaMessageWatcherControllerConfig } from "./Controller";
import type { WatcherOptions } from "./types";

type WatchersClientWithController = BaseClient & {
    [Keys.clientWatcherController]?: WatchersController;
};

export const createController = ({ client, cache }: YunaMessageWatcherControllerConfig) => {
    const self = client as WatchersClientWithController;
    // biome-ignore lint/suspicious/noAssignInExpressions: penguin
    return (self[Keys.clientWatcherController] ??= new WatchersController({ client, cache }));
};

export const getController = (client: AvailableClients) => {
    return (client as WatchersClientWithController)[Keys.clientWatcherController];
};

export const createWatcher = <const O extends OptionsRecord | undefined = undefined, const C extends WatcherCreateData = WatcherCreateData>(
    ctx: C,
    options?: WatcherOptions,
) => {
    return createController({ client: ctx.client }).create<O, C>(ctx, options);
};
