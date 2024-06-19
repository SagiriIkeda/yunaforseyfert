<center>
<img src="https://i.imgur.com/brbipcY.png" alt="yunaforseyfert"  style="max-width: 80%; padding-bottom: 30px"/>
</center>

> ` yunaforseyfert ` it's a package that tries to bring the features of my bot, but for seyfert, at a really slow pace. 
> *This really is for me and my friends. **(my first enemies)***

# installation 

you can do it using `npm` or another packager manager, i prefer use  `pnpm`

```
pnpm add yunaforseyfert
```

# Features

<details>

  <summary>
    <h2 style="display: inline">YunaParser</h2>
    <br/>
    <blockquote style="padding-left:10px;margin-top:10px">
    <i> an <strong>args parser for text commands</strong>,
    which adds various syntax for more convenient use of said commands,
    to the standard one provided.</i>
    </blockquote>
  </summary>

### Installation

After you install `yunaforseyfert` you need to import `Yuna` like this

```js
import { Yuna } from "yunaforseyfert"
```

Then, you need to add it as seyfert's default argsParser, as follows

```js
import { HandleCommand } from "seyfert/lib/commands/handle";
import { Yuna } from "yunaforseyfert";

class YourHandleCommand extends HandleCommand {
    argsParser = Yuna.parser(); // Here are the settings, but that will be explained below
}
// your bot's client
client.setServices({
    handleCommand: YourHandleCommand,
});

```

And now, the magic will begin!

### How this works, and what do?

Let's say you have the following command

```js
const options = {
  first: createStringOption({
    description: "Penguins are life",
    required: true
  }),
  second: createStringOption({
    description: "Do you know i love penguins?",
    required: true
  })
}

@Declare({
  name: 'test',
  description: 'Test command'
})
@Options(options)
export default class TestCommand extends Command {

  async run(ctx: CommandContext<typeof options>) { 

    const { first, second } = ctx.options;

    const embed = new Embed({
        title: "Parsed!",
        fields: [
            {
                name: "First",
                value: first
            },
            {
                name: "Second",
                value: second
            }
        ]
    })

    await ctx.write({
      embeds: [embed]
    });
  }

}
```

The command has two options `first` and `second`, in that order.


For the parser, each word counts as an option, and will be added in the order of the command. That is, if we use the command in the following way:

<img src="https://i.imgur.com/xdpSRIg.png" width="100%" />


`ctx.options` will be return 
```json
{
    "first": "Hellow!",
    "second": "penguin"
}
```

But, if i want to use more than one word?

You can use the following syntax

`"your words"` `'your beutiful sentence'` **\`penguin world\`**

<img src="https://i.imgur.com/Us2zi3V.png" width="100%" />

it will return 

```json
{
    "first": "your words",
    "second": "your beatiful sentence"
}
```
Another case is that the option is the last or only one, in this case it will not be necessary to use "" and all the remaining content will be taken as the option. Example:

<img src="https://i.imgur.com/MayfQbj.png" width="100%" />

#### Named Syntax

**What if I want to use the options in the order I want or need?**

you can use the following syntaxes

`--option` content

`-option` content

`option:` content

Like this.

<img src="https://i.imgur.com/6olfDEu.png" width="100%" />

Also, if an option is of type `Boolean` , when used with only the `-option` or `--option` syntax with nothing else following it, it will return true. Example:

<img src="https://i.imgur.com/T8JwCdY.png" width="100%" />

```json
{
  "first": "hello",
  "devmode": "true" // will later be converted to true.
}
```



#### Escaping characters

You can escape any special character or syntax, if you need to, using `\`

<img src="https://i.imgur.com/i1SROrV.png" width="100%"/>

this will return:

```json
{
    "first": "hey!",
    "second": "how are you? --second well."
}
```
also this works with 

`"` `'` **\`** 

`:` `-` `--` *(in named options)*

`/` *(in urls, like https://)*

### Config
The configurations allow changing the behavior of the parser; this is done when using `Yuna.parser` The allowed ones are as follows:

```ts
Yuna.parser({
    /**
     * this only show console.log with the options parsed.
     * @default false */
    logResult: false,
    /** syntaxes enabled */
    syntax: {
        /** especify what longText tags you want
         *
         * " => "penguin life"
         *
         * ' => 'beautiful sentence'
         *
         * ` => `Eve『Insomnia』 is a good song`
         *
         * @default 🐧 all enabled
         */
        longTextTags: ['"', "'", "`"],
        /** especify what named syntax you want
         *
         *  -  => -option content value
         *
         *  -- => --option content value
         *
         *  :  => option: content value
         *
         * @default 🐧 all enabled
         */
        namedOptions: ["-", "--", ":"]
    },

    /**
     * Turning it on can be useful for when once all the options are obtained,
     * the last one can take all the remaining content, ignoring any other syntax.
     * @default {false}
     */
    breakSearchOnConsumeAllOptions: false,

    /**
     * Limit that you can't use named syntax "-" and ":" at the same time,
     * but only the first one used, sometimes it's useful to avoid confusion.
     * @default {false}
     */
    useUniqueNamedSyntaxAtSameTime: false,
    /**
    * This disables the use of longTextTags in the last option
    * @default {false}
    */
    disableLongTextTagsInLastOption: false,


    /** Use Yuna's choice resolver instead of the default one, put null if you don't want it,
     * 
     * YunaChoiceResolver allows you to search through choices regardless of case or lowercase, 
     * as well as allowing direct use of an choice's value,
     * and not being forced to use only the name. 
     * 
     * @default enabled
     */
    resolveCommandOptionsChoices: {
        /** Allow you to use the value of a choice directly, not necessarily search by name
         * @default {true}
         */
        canUseDirectlyValue: true;
    };

    /** If the first option is of the 'User' type,
     *  it can be taken as the user to whom the message is replying.
     *  @default {null} (not enabled)
     */
    useRepliedUserAsAnOption?: {
        /** need to have the mention enabled (@PING) */
        requirePing: boolean;
    } | null;
})
```

**breakSearchOnConsumeAllOptions example**


<img src="https://i.imgur.com/duer8NK.png" width="100%" />

**useUniqueNamedSyntaxAtSameTime example**


<img src="https://i.imgur.com/myHrl9L.png" width="100%" />

**disableLongTextTagsInLastOption example**


<img src="https://i.imgur.com/2BNIBIx.png" width="100%" />


**useRepliedUserAsAnOption**

> Suppose we have a command with two options, `user` and `message`. As long as we have the `useRepliedUserAsAnOption` option set, the `user` option will be taken as the user to whom the message is replying, and the other options (if any) will be used normally in the message. In case you are not replying to any message `user` will have to be specified in the message, as it is normally. Example:

**replying example**


<img src="https://i.imgur.com/7aujz0w.png" width="100%" />

**not replying example**


<img src="https://i.imgur.com/llpFwE9.png" width="100%" />

Also, if necessary, each command can use a specific configuration. For this, you can use the `@DeclareParserConfig` decorator

```js
import { DeclareParserConfig } from "yunaforseyfert";


const options = {
    first: createStringOption({
        description: "first option",
        required: true,
    }),
};

@Declare({
    name: "test",
    description: "with penguins the life is better.",
})
@Options(options)
@DeclareParserConfig({
  // Place your settings here
}) 
export default class TestCommand extends Command {}
```

Also, we provide some recommended configurations `(only one at the moment :] )` for commands such as an Eval.

This can be used as

```js
import { DeclareParserConfig, ParserRecommendedConfig } from "yunaforseyfert";


@DeclareParserConfig(ParserRecommendedConfig.Eval)
```
This will enable **disableLongTextTagsInLastOption** and **breakSearchOnConsumeAll**. Things that I consider necessary in an eval.


### "Demostration" thanks to @justo
<img src="https://i.imgur.com/cRrLoG2.gif" width="100%" />

</details>

<details>

  <summary>
  <h2 style="display: inline">YunaCommandsResolver</h2>
  <br/>

  <blockquote style="padding-left:10px;margin-top:10px">
  <i>a resolver, which provides some extra functions. </i>
  </blockquote>
  </summary>

</details>

<details>

  <summary>
  <h2 style="display: inline">MessageWatcher</h2>
  <br/>
  <blockquote style="padding-left:10px;margin-top:10px">
  <i>A simple solution to be able to manage when a message is edited and update the command options. </i>
  </blockquote>
  </summary>

</details>

<br/>

And more **features** coming soon! ***(not so soon)*** 🐧


# FAQ

<details>

  <summary>
  <h2 style="display: inline">Migrate from &lt;v0.10 to v1.0 (and Seyfert v1 to v2)</h2>
  </summary>

The way to set the `argsParser` has changed in `seyfert v2`, it has also changed its name
now it should be done as follows:

  ```diff
- import { YunaParser } from "yunaforseyfert"
- 
- // your bot's client
- new Client({ 
-     commands: {
-         argsParser: YunaParser() // Here are the settings
-     }
- });
+ import { HandleCommand } from "seyfert/lib/commands/handle";
+ import { Yuna } from "yunaforseyfert";
+ 
+ const client = new Client();
+ 
+ class YourHandleCommand extends HandleCommand {
+     argsParser = Yuna.parser(); // Here are the settings
+ }
+ 
+ client.setServices({
+     handleCommand: YourHandleCommand,
+ });
  ```

Also the `enabled` configuration of the `Yuna.parser` has been renamed to `syntax`.
```diff
- YunaParser({
-   enabled: {
-     // ...
-   }
- })
+ Yuna.parser({
+   syntax: {
+     // ...
+   }
+ })
```

</details>

<br/>


```
    Thanks for read and using yunaforseyfert!
    By SagiriIkeda with 🐧❤️
```

