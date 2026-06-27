const { decorate } = require("../../helpers/decorator.js")
const { loadCommands } = require("../../index.js")

async function run(ctx) {
    const { sock, from, msg, language } = ctx;

    let help_content;

    if (language[ctx.args[0]]?.help) {
        help_content = language[ctx.args[0]].help
        help_content = help_content.replaceAll("|", ctx.prefix)
    } else if (await Object.keys(loadCommands()).includes(ctx.args[0])) {
        await sock.sendMessage(
            from,
            {
                text: await decorate(
                    {
                        emoji: "💡",
                        title: ctx.cmd,
                        content: [
                            {
                                type: "text",
                                items: [
                                    `${language.help.no_help}`
                                ]
                            }
                        ]
                    }
                )
            },
            { quoted: msg }
        );
        return
    } else {
        await sock.sendMessage(
            from,
            {
                text: await decorate(
                    {
                        emoji: "💡",
                        title: ctx.cmd,
                        content: [
                            {
                                type: "text",
                                items: [
                                    `${language.help.no_help_no_exist}`
                                ]
                            }
                        ]
                    }
                )
            },
            { quoted: msg }
        );
        return
    }

    await sock.sendMessage(
        from,
        {
            text: await decorate(
                {
                    emoji: "💡",
                    title: ctx.cmd,
                    content: [
                        {
                            type: "text",
                            items: [
                                `${help_content}`
                            ]
                        }
                    ]
                }
            )
        },
        { quoted: msg }
    );
}


module.exports = {
    run
}

