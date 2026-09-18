const path = require("path");
const { decorate } = require("../../helpers/decorator.js");
const { loadCommands, getLanguage } = require("../../index.js");
const util = require('util');
const fs = require("node:fs");

async function run(ctx) {
    const { sock, from, msg, getString, args, cmd } = ctx;

    if (args.length === 0) {
        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "💡",
                title: getString("help/help").toLowerCase(),
                content: [{ type: "text", items: [util.format(getString("generic/incorrect_syntax"), ctx.prefix, cmd)] }]
            })
        }, { quoted: msg })
    }

    const requestedCommand = args[0]
    const commands = await loadCommands()

    if (!Object.keys(commands).includes(requestedCommand)) {
        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "💡",
                title: getString("help/help").toLowerCase(),
                content: [{ type: "text", items: [getString("help/command_doesnt_exist"), util.format(getString("help/to_see_all_commands"), ctx.prefix + "menu")] }]
            })
        }, { quoted: msg })
    }

    const help_path = path.resolve(commands[requestedCommand] + "/../help_bundles/res-" + getLanguage() + "/" + requestedCommand + ".html")

    try {
        help_page = await fs.promises.readFile(help_path, 'utf8')

        help_page_styled = help_page.replaceAll("<br>", "\n")
                                    .replaceAll("<code>", "`")
                                    .replaceAll("</code>", "`")
                                    .replaceAll("<b>", "*")
                                    .replaceAll("</b>", "*")
                                    .replaceAll("<code usage>", "> `")

        console.log(help_page_styled)

        await sock.sendMessage(from, {
            text: await decorate({
                emoji: "💡",
                title: getString("help/help").toLowerCase(),
                content: [{ type: "raw", items: [help_page_styled] }]
            })
        }, { quoted: msg })

    } catch (err) {

        if (err.code === "ENOENT") {
            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "💡",
                    title: getString("help/help").toLowerCase(),
                    content: [{ type: "text", items: [getString("help/no_help")] }]
                })
            }, { quoted: msg })
        } else {
            throw err
        }
        
    }
}

module.exports = {
    run
};