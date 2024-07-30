
### Implementation and Usage

You have some ways to use it, use whichever you prefer. They are practically the same.

#### Using the `@Watch` decorator:

```ts
import { Watch } from "yunaforseyfert";

/** ... */
@Options(options)
export default class TestCommand extends Command {
  // example
  @Watch({ time: 100_000  /** 100s */  })
  async run(ctx: CommandContext<typeof options>) {
    ctx.editOrReply({ content: ctx.options.text });
  }
}
```
And now it will be updated every time the message is edited!

##### `@Watch` options 

```ts
@Watch({
  /** filters the execution of the `onChange` event */
  filter(ctx) { return true },
  time: 100_000,
  /** Downtime until the watcher stops. */
  idle: 10_000, 

  // others optionally events

  /**
   * It will be emitted before creating the watcher,
   * if you return `false` it will not be created.
   */
  beforeCreate(ctx) {},

  /** 
   * when the user has removed or used an unrecognized prefix, or changed the command he was using.
    * reason can be: "UnspecifiedPrefix" | "CommandChanged"
  */
  onUsageError(error) { console.log({ error }) },
  /** when there was an error when parsing options */
  onOptionsError(error) { console.log({ error }) },

  onStop(reason) { 
    this.ctx.editOrReply({ content: `watcher stopped by reason: ${reason}` }) 
  },
})
```


#### Using the `createWatcher` function:

```ts
import { createWatcher } from "yunaforseyfert";

// and now use it in your commands in the following way

/** ... */
@Options(options)
export default class TestCommand extends Command {
  // example
  async run(ctx: CommandContext<typeof options>) {
    const msg = await ctx.editOrReply({ content: ctx.options.text });

    // checks that there is a message to be observed
    if(!msg || !ctx.message) return;

    const watcher = createWatcher(ctx, {
      // how long will the watcher last
      time: 100_000,
      // you also have the idle property
    });

    // Find out when the message has changed and get the new options.
    watcher.onChange((options) => {
      msg.edit({ content: options.text });
    });

    // others optionally events
    watcher.onStop((reason) => {
      ctx.write({ content: `watcher stopped by reason: ${reason}` });
    })

    watcher.onOptionsError((error) => console.log({ error }))

    watcher.onUsageError((reason) => console.log({ reason }))

    // to stop a watcher use
    watcher.stop("reason")

  }
}


```

if necessary you can also create a watcher as follows

```ts
createWatcher<typeof options>({
  client, // your client
  command, // used command
  message, // msg
}, { 
  /* options...*/ 
})
```

#### `Yuna.watchers` utils

- **`Yuna.watchers.createController`**

By default all watchers are stored in a `Map`, but if you wanted to you could use a `LimitedCollection` as follows:

```ts
import { LimitedCollection } from "seyfert";

Yuna.watchers.createController({
  client, // your bot's client
  cache: new LimitedCollection( /** your settings */)
})
```
- **`Yuna.watchers.getFromContext`**

Get the list of `watchers` (there may be more than one) associated to a `CommandContext`

```ts
Yuna.watchers.getFromContext(ctx)
```
- **`Yuna.watchers.find`**

Find an `MessageWatcherManager` from a query.

```ts
// usage example
Yuna.watchers.find(client, {
  /** query properties */
  userId: ctx.author.id,
  // messageId
  // channelId
  // guildId
  // command {Command | SubCommand}
})

// the query can also be a callback that returns a boolean
Yuna.watchers.find(client, (watcher) => watcher.message.author.id === ctx.author.id)
```

- **`Yuna.watchers.findMany`**

Similar to `find` but this one will filter through all, it is used in the same way, but it will return all matches

- **`Yuna.watchers.isWatching`**

Use it to know when a `CommandContext` is being watched.

- **`Use example`**

Suppose you want to limit that a user can only have one watcher at a time in your command.

Using the `@Watch` decorator you would do it with the beforeCreate event, and with `createWatcher` before executing that function.  Example with the `beforeCreate`

```ts
@Watch({
  idle: 10_000,
  beforeCreate(ctx) {
    // Get some watcher associated to the user in this command
    const userWatcher = Yuna.watchers.find(ctx.client, {
        userId: ctx.author.id,
        command: this, // this refers to the Command
    });
    
    // If found, we stop it
    userWatcher?.stop("AnotherInstanceCreated");
  }
})
```

> Also, `Watch` is an alias for `Yuna.watchers` :)

