### Installation

Set `Yuna.resolve` as the default `resolveCommandFromContent` of seyfert, as follows:

```js

import { HandleCommand } from "seyfert/lib/commands/handle";
import { Yuna } from "yunaforseyfert";

class YourHandleCommand extends HandleCommand {

  resolveCommandFromContent = Yuna.resolver({
      /**
       * You need to pass the client in order to prepare the commands that the resolver will use.
      */
      client: this.client,
      /**
       * Event to be emitted each time the commands are prepared.
      */
      afterPrepare: (metadata) => {
          this.client.logger.debug(`Ready to use ${metadata.commands.length} commands !`);
      },
  });

}

yourBotClient.setServices({
  handleCommand: YourHandleCommand,
});
```

After this, you are ready to enjoy the following advantages!

### Case Insensitive

> Ise your commands regardless of case, it will sound stupid in some cases
> 
> But I have seen users try to use them with capital letters. 🐧

### Shortcuts 

Accesses a subcommand or group, without the need to place the parent command. For example, you would normally access it as `music play`, now you can access it directly as `play`.

To configure it in your subcommands, you must use the `@Shortcut` decorator.

```ts
import { Shortcut } from "yunaforseyfert";

@Declare({
    name: "example",
    description: "example subCommand",
})
@Group("penguin")
@Shortcut()
export default class ExampleSubCommand extends SubCommand {
    // ...
}

```
And now it can be accessed directly as `example` without the parent command.

In groups the configuration is as follows, you must add the `shortcut` property as `true` in your group. Example:

```ts
/** ... */
@Groups({
  penguin: {
      defaultDescription: "penguin group",
      shortcut: true,
  }
})
export default class ParentCommand extends Command {}
```

And now the subCommand shown above can also be accessed as `penguin example` without the parent.

### FallbackSubCommand

Used to access a default subcommand, in case one is not found.

Suppose you have the following command structure:

```
- parent
    - sub1
    - group
        - sub
    - sub2
    - sub3
 ```

And the user has tried to use `parent sub4`

since that subcommand does not exist, `sub1` (or another specified one, but by default it will be the first one, from the parent or group) will be used.

It is also useful to use a subcommand without placing its name.

To enable this feature globally, when using `Yuna.resolve`, add the `useFallbackSubCommand` property as `true`. Example:

```ts
Yuna.resolver({
  //...
  useFallbackSubCommand: true,
})
```


It can also be enabled/disabled on a specific parent command using the `@DeclareFallbackSubCommand` decorator as follows:

```ts
import { DeclareFallbackSubCommand } from "yunaforseyfert";
import PrimarySubCommand from "./primary.js"

@Options([PrimarySubCommand, /* ...*/])
@DeclareFallbackSubCommand(PrimarySubCommand) // You must pass the class of the subCommand that will be taken by default, or null to disable this feature.
export default class ParentCommand extends Command {}
```

In a group it is established as follows: 

```ts
import PrimaryGroupSubCommand from "./penguin/primary.js"

/** ... */
@Groups({
  penguin: {
      defaultDescription: "penguin group",
      fallbackSubCommand: PrimaryGroupSubCommand,
  }
})
export default class ParentCommand extends Command {}
```

### Note

> For the correct functioning of the resolver the commands must be prepared, this is done by default after they are all loaded or reloaded. But if you reload a specific Command/SubCommand it is recommended that you reprepare the commands manually, this can be done by:

```ts 
import { Yuna } from "yunaforseyfert"

Yuna.commands.prepare(client /* your bot's client */)
```