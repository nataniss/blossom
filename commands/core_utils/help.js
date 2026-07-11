const path = require("path");
const { decorate } = require("../../helpers/decorator.js");
const { loadCommands } = require("../../index.js");

async function run(ctx) {
    const { sock, from, msg, getString } = ctx;
    const requestedCmd = ctx.args[0];

    const CommandMap = await loadCommands();
    let help_content = null;

    if (CommandMap[requestedCmd]) {
        const filePath = CommandMap[requestedCmd];
        
        const baseFileName = path.basename(filePath, ".js");

        if (getString(baseFileName + "/help") !== `[${baseFileName}/help]`) {
            help_content = getString(baseFileName + "/help");
            help_content = help_content.replaceAll('|', ctx.prefix)
            help_content = help_content.replaceAll('¨', "\n\n*" + getString("help/captions_text") + "*\n\n" + getString("help/captions"))
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
                            items: [`${getString("help/no_help")}`]
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
                            items: [`${getString("help/no_help_no_exist")}`]
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