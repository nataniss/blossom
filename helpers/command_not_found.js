const { decorate } = require("./decorator.js")
const { loadCommands } = require("../index.js")
const util = require('util');
const stringSimilarity = require("string-similarity");


async function run(ctx) {
    const { sock, from, msg, language } = ctx;

    await sock.sendMessage(
        from,
        {
            react: {
                text: '❓',
                key: msg.key
            }
        }
    );

    const currentHour = new Date(Date.now()).getHours();

    const commandMap = await loadCommands();

    const commandList = Object.keys(commandMap);

    let suggestionText = "";

    if (commandList.length > 0) {
        const matches = stringSimilarity.findBestMatch(ctx.cmd.toLowerCase(), commandList);
        const bestMatch = matches.bestMatch;

        if (bestMatch.rating > 0.4) {
            suggestionText = util.format(`${language.not_found.did_you_mean}`, `${ctx.prefix}${bestMatch.target}`);
        }
    }

    const greetings = [
        language.not_found.good_morning,
        language.not_found.good_afternoon,
        language.not_found.good_night,
    ]

    let greeting = ""

    if (currentHour >= 6 && currentHour < 12) {
        greeting = greetings[0];
    } else if (currentHour >= 12 && currentHour < 18) {
        greeting = greetings[1];
    } else {
        greeting = greetings[2];
    }


    const listItems = [
        {
            text: `${util.format(greeting, "@" + ctx.senderNumber)}`,
            list_item_type: "simple_item"
        },
        {
            text: `${util.format(language.not_found.doesnt_exist, ctx.prefix + ctx.cmd)}`,
            list_item_type: "simple_item"
        }
    ];

    if (suggestionText) {
        listItems.push({
            text: suggestionText,
            list_item_type: "simple_arrow"
        });
    }

    listItems.push({
        text: `${util.format(language.not_found.to_see_all_commands, ctx.prefix + "menu")}`,
        list_item_type: "simple_item"
    });

    await sock.sendMessage(from, {
        text: await decorate({
            emoji: "❓",
            title: language.command_not_found.toLowerCase(),
            content: [
                {
                    type: "list_complex",
                    padding: 1,
                    items: listItems
                }
            ]
        }), mentions: [ctx.senderNumber + "@s.whatsapp.net"]
    }, { quoted: msg });

}

module.exports = {
    run
}

