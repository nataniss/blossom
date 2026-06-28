const path = require("path");
const { decorate } = require("../../helpers/decorator.js");
const { loadCommands } = require("../../index.js");

async function run(ctx) {
    const { sock, from, msg, language } = ctx;
    const requestedCmd = ctx.args[0];

    const CommandMap = await loadCommands();
    let help_content = null;

    if (CommandMap[requestedCmd]) {
        const filePath = CommandMap[requestedCmd];
        
        const baseFileName = path.basename(filePath, ".js");

        if (language[baseFileName]?.help) {
            help_content = language[baseFileName].help.replaceAll("|", ctx.prefix);
        }
    }

    if (help_content) {
        await sock.sendMessage(
            from,
            {
                text: await decorate({
                    emoji: "💡",
                    title: ctx.cmd,
                    content: [
                        {
                            type: "text",
                            items: [`${help_content}`]
                        }
                    ]
                })
            },
            { quoted: msg }
        );
        return;
    }

    if (Object.keys(CommandMap).includes(requestedCmd)) {
        await sock.sendMessage(
            from,
            {
                text: await decorate({
                    emoji: "💡",
                    title: ctx.cmd,
                    content: [
                        {
                            type: "text",
                            items: [`${language.help.no_help}`]
                        }
                    ]
                })
            },
            { quoted: msg }
        );
        return;
    }

    await sock.sendMessage(
        from,
        {
            text: await decorate({
                    emoji: "💡",
                    title: ctx.cmd,
                    content: [
                        {
                            type: "text",
                            items: [`${language.help.no_help_no_exist}`]
                        }
                    ]
                })
            },
        { quoted: msg }
    );
}

module.exports = {
    run
};