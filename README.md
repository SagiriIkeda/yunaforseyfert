<center>
<img src="https://i.imgur.com/brbipcY.png" alt="yunaforseyfert"  style="max-width: 80%; padding-bottom: 30px"/>
</center>

> ` yunaforseyfert ` it's a package that tries to bring the features of my bot, but for seyfert, at a really slow pace. 
> *This really is for me and my friends. **(my first enemies)***

# Installation 

You can do it using `npm` or another packager manager, i prefer use  `pnpm`

```
pnpm add yunaforseyfert
```

# Features

## YunaParser
> *An **args parser for text commands**, which adds various syntax for more convenient use.*  
>
> <img src="https://i.imgur.com/cRrLoG2.gif" width="100%" />
>
> [📖 See Parser docs](https://github.com/SagiriIkeda/yunaforseyfert/wiki/Parser)

## YunaCommandsResolver  
> *A text command resolver, which provides some extra functions.*  
>[📖 See Resolver docs](https://github.com/SagiriIkeda/yunaforseyfert/wiki/CommandsResolver)

## MessageWatcher
> *A simple solution to be able to manage when a message is edited and update the command options.*  
> 
> <img src="https://i.imgur.com/Yp6tSkM.gif" width="100%"  style="border-radius: 10px;"/>
>
> [📖 See Watcher docs](https://github.com/SagiriIkeda/yunaforseyfert/wiki/MessageWatcher)


And more **features** coming soon! ***(not so soon)*** 🐧

# FAQ

<details open>
    <summary>
        <h2 style="display: inline">Migrate to seyfert v5</h2>
    </summary>

Previous versions of **Seyfert** integrated **Yuna** as part of the `HandleCommand` in `client.setServices`.
But now **Seyfert v5** has switched to a new plugin based system, as follows:

```ts
import { Client, definePlugins } from "seyfert";
import { Yuna } from "yunaforseyfert";

const client = new Client({
    plugins: definePlugins(
        Yuna.plugin({
            parser: {
              // parser options
            }, // or simply parser: true, to enable it with default settings,
            
            resolver: {
              // resolver options
            }, // or simply resolver: true, to enable it with default settings,
            
            // also the settings for `Yuna.watchers.createController` should be placed here
            watcher: { // example (optional)
              cache: new LimitedCollection( /** your settings */)
            }

        }),
    ),
});
```

Thanks to *[@socram03](https://github.com/socram03)* for updating yunaforseyfert to Seyfert v5. 🐧❤️

> NOTE: The previous method of adding yunaforseyfert may still work, but you might want to consider migrating to the new method.
</details>
<br/>

```
    Thanks for read and using yunaforseyfert!
    By SagiriIkeda with 🐧❤️
```