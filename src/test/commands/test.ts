import { Command, Declare, Embed, Options, createStringOption, type CommandContext } from 'seyfert';

const options = {
  first: createStringOption({
    description: "Penguins are life",
    required: true
  }),
  second: createStringOption({
    description: "Do you know i love penguins?",
    required: true
  })
} as const

@Declare({
  name: 't',
  description: 'testing'
})
@Options(options)
export default class TestCommand extends Command {

  async run(ctx: CommandContext<typeof options>) {
    // average latency between shards    

    const embed = new Embed({
      title: "Parsed!",
      fields: [
        {
          name: "input",
          //@ts-ignore
          value: `\`\`\`js\n${ctx.message?.content}\`\`\``
        },
        {
          name: "Output",
          value: `\`\`\`js\n${JSON.stringify(ctx.options, null, 4)}\`\`\``
        }
      ]

    })

    await ctx.write({
      embeds: [embed]
    });
  }

  async onOptionsError(
    context: CommandContext<typeof options>,
  ) {

    await context.editOrReply({
      content: "You need to use two options"
    });
  }
}