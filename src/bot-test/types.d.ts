import type { Client, ParseClient } from "seyfert";

declare module "seyfert" {
    interface UsingClient extends ParseClient<Client<true>> { }

    interface InternalOptions {
        withPrefix: true;
    }
}
