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
        argsParser: YunaParser()
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

    const {first, second} = ctx.options;

    await ctx.write({
      embeds: [
        new Embed({
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
        ]
    });
  }

}
```

The command has two options `first` and `second`, in that order.


For the parser, each word counts as an option, and will be added in the order of the command. That is, if we use the command in the following way:

<img src="https://i.imgur.com/xdpSRIg.png" />


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

<img src="https://i.imgur.com/mB9Jgfp.png" />

it will return 

```json
{
    "first": "your words",
    "second": "your beatiful sentence"
}
```
Another case is that the option is the last or only one, in this case it will not be necessary to use "" and all the remaining content will be taken as the option, Example:

<img src="https://i.imgur.com/9zjO00U.png" />

#### Named Syntax

**What if I want to use the options in the order I want or need?**

you can use the following syntaxes

`--option` content

`-option` content

`option:` content

Like this.

<img src="https://i.imgur.com/6olfDEu.png" />

#### Escaping characters

You can escape any special character or syntax, if you need to, using `\`

<img src="https://i.imgur.com/xNMc1eu.png" />

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


#### "Demostration" thanks to @justo
<video src="https://i.imgur.com/WABBTYE.mp4" autoplay loop></video>


> ```
> Thanks for read and using yunaforseyfert!
> By SagiriIkeda with 🐧
> ```


