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
> [📖 See Parser docs](https://github.com/SagiriIkeda/yunaforseyfert/blob/main/docs/Parser)

## YunaCommandsResolver  
> *A resolver, which provides some extra functions.*  
>[📖 See Resolver docs](https://github.com/SagiriIkeda/yunaforseyfert/blob/main/docs/CommandsResolver)

## MessageWatcher
> *A simple solution to be able to manage when a message is edited and update the command options.*  
> [📖 See Watcher docs](https://github.com/SagiriIkeda/yunaforseyfert/blob/main/docs/MessageWatcher)


And more **features** coming soon! ***(not so soon)*** 🐧

# FAQ

<details>

  <summary>
  <h2 style="display: inline">Migrate from &lt;v0.10 to v1.0 (and Seyfert v1 to v2)</h2>
  </summary>

The way to set the `argsParser` has changed in `seyfert v2`, it has also changed its name
now it should be done as follows:

  ```diff
- import { YunaParser } from "yunaforseyfert";
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