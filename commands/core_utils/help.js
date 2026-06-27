const { decorate } = require("../../helpers/decorator.js")
const { loadCommands } = require("../../index.js")

async function run(ctx) {
    const { sock, from, msg, language } = ctx;

    let help_content;

    if (language[ctx.args[0]]?.help) {
        help_content = language[ctx.args[0]].help
        help_content = help_content.replaceAll("|", ctx.prefix)
        help_content = help_content.replaceAll("º", ctx.args[0])
    } else if (await Object.keys(loadCommands()).includes(ctx.args[0])) {
        await sock.sendMessage(
            from,
            {
                text: await decorate(
                    {
                        emoji: "💡",
                        title: "ajuda",
                        content: [
                            {
                                type: "text",
                                items: [
                                    `${language.help.no_help}`
                                ]
                            }
                        ]
                    }
                ),
                mentions: [ctx.senderNumber + "@s.whatsapp.net"]
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
                        title: "ajuda",
                        content: [
                            {
                                type: "text",
                                items: [
                                    `${language.help.no_help_no_exist}`
                                ]
                            }
                        ]
                    }
                ),
                mentions: [ctx.senderNumber + "@s.whatsapp.net"]
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
                    title: "ajuda",
                    content: [
                        {
                            type: "text",
                            items: [
                                `${help_content}`
                            ]
                        }
                    ]
                }
            ),
            mentions: [ctx.senderNumber + "@s.whatsapp.net"]
        },
        { quoted: msg }
    );
}


module.exports = {
    run
}

