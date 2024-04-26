# yunaforseyfert

this really is for me and my friends. (my first enemies)

yunaforseyfert, it's a package that tries to bring the features of my bot, but for seyfert, at a really slow pace

# installation 

you can do it using `npm` or another packager manager, i prefer use  `pnpm`

```
pnpm add yunaforseyfert
```

# Features

## YunaParser 

An **args parser for text commands**, which adds various syntax for more convenient use of said commands, to the standard one provided.

### Installation

After you install `yunaforseyfert` you need to import `YunaParser` like this

```js
import { YunaParser } from "yunaforseyfert"
```

Then, you need to add it as seyfert's default argsParser, as follows

```js
// your bot's client
new Client({ 
    commands: {
        argsParser: YunaParser() // Here are the settings, but that will be explained below
    }
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
      embeds: [embeds]
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

`"your words"` `'yout beutiful sentence'` **\`penguin world\`**

<img src="https://i.imgur.com/mB9Jgfp.png" width="100%" />

it will return 

```json
{
    "first": "your words",
    "second": "your beatiful sentence"
}
```
Another case is that the option is the last or only one, in this case it will not be necessary to use "" and all the remaining content will be taken as the option, Example:

<img src="https://i.imgur.com/9zjO00U.png" width="100%" />

#### Named Syntax

**What if I want to use the options in the order I want or need?**

you can use the following syntaxes

`--option` content

`-option` content

`option:` content

Like this.

<img src="https://i.imgur.com/6olfDEu.png" width="100%" />


#### Escaping characters

You can escape any special character or syntax, if you need to, using `\`

<img src="https://i.imgur.com/xNMc1eu.png" width="100%"/>

this will return:

```json
{
    "first": "your",
    "second": "words --second penguin life"
}
```
also this works with 

`"` `'` **\`** 

`:` `-` `--` *(in named options)*

`/` *(in urls, like https://)*

### Config
The configurations allow changing the behavior of the parser; this is done when using `YunaParser` The allowed ones are as follows:

```ts
YunaParser({
    /**
     * this only show console.log with the options parsed.
     * @default false */
    logResult: false,

    enabled: {
        /** especify what longText tags you want
         *
         * " => "penguin life"
         *
         * ' => 'beautiful sentence'
         *
         * ` => `LiSA『Shouted Serenade』 is a good song`
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
})
```

**breakSearchOnConsumeAllOptions example**


<img src="https://i.imgur.com/8lf8K5C.png" width="100%" />

**useUniqueNamedSyntaxAtSameTime example**


<img src="https://i.imgur.com/LsBV6Xq.png" width="100%" />

**disableLongTextTagsInLastOption example**


<img src="https://i.imgur.com/kkwN0gx.png" width="100%" />

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

> ```
> Thanks for read and using yunaforseyfert!
> By SagiriIkeda with 🐧
> ```


