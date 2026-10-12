const { translate } = require('google-translate-api-x');
const { decorate } = require("../../helpers/decorator.js");
const util = require('util');
const language_flags = require("./language_flags.json");
const {
    useEnhanced
} = require("../../index.js");
const {
    getProp
} = require("../../helpers/prop_mgr.js");

async function run(ctx) {
    const { sock, from, msg, args, getString, prefix, cmd } = ctx;

    const text = args.join(" ").trim();
    if (!text) return await sock.sendMessage(from, {
        text: await decorate({
            emoji: "🌐",
            title: getString("translate/translate").toLowerCase(),
            content: [
                {
                    type: "list_complex",
                    padding: 1,
                    items: [
                        {
                            text: `${getString("translate/no_text")}`,
                            list_item_type: "simple_item"
                        }
                    ]
                }
            ]
        })
    }, { quoted: msg });

    const regex = /\[\[(.*?)\]\]/g;
    const matches = [...text.matchAll(regex)];
    const langs = matches.map(match => match[1]);

    if (langs.length === 0 || langs.length > 2) return await sock.sendMessage(from, {
        text: await decorate({
            emoji: "🌐",
            title: getString("translate/translate").toLowerCase(),
            content: [
                {
                    type: "list_complex",
                    padding: 1,
                    items: [
                        {
                            text: `${util.format(getString("generic/incorrect_syntax"), prefix, cmd)}`,
                            list_item_type: "simple_item"
                        }
                    ]
                }
            ]
        })
    }, { quoted: msg });

    const firstMatch = matches[0];
    const lastMatch = matches[matches.length - 1];

    const isAtStart = firstMatch.index === 0;
    const isAtEnd = (lastMatch.index + lastMatch[0].length) === text.length;

    const isValidPosition = (langs.length === 1 && (isAtStart || isAtEnd)) ||
        (langs.length === 2 && isAtStart); 

    let textToTranslate = "";
    if (langs.length === 1) {
        if (isAtStart) {
            textToTranslate = text.slice(firstMatch[0].length).trim();
        } else if (isAtEnd) {
            textToTranslate = text.slice(0, firstMatch.index).trim();
        } else {
            return;
        }
    } else if (langs.length === 2) {
        if (isAtStart) {
            const secondMatchEnd = matches[1].index + matches[1][0].length;
            textToTranslate = text.slice(secondMatchEnd).trim();
        } else {
            return;
        }
    } else {
        return;
    }

    const maxChars = 5000

    if (textToTranslate.length > maxChars) return await sock.sendMessage(from, {
        text: await decorate({
            emoji: "🌐",
            title: getString("translate/translate").toLowerCase(),
            content: [
                {
                    type: "list_complex",
                    padding: 1,
                    items: [
                        {
                            text: `${util.format(getString("translate/error_too_big"), maxChars)}`,
                            list_item_type: "simple_item"
                        }
                    ]
                }
            ]
        })
    }, { quoted: msg });

    if (!textToTranslate) return await sock.sendMessage(from, {
        text: await decorate({
            emoji: "🌐",
            title: getString("translate/translate").toLowerCase(),
            content: [
                {
                    type: "list_complex",
                    padding: 1,
                    items: [
                        {
                            text: `${getString("translate/no_text")}`,
                            list_item_type: "simple_item"
                        }
                    ]
                }
            ]
        })
    }, { quoted: msg });

    const languages_valid = langs.every(lang => language_flags.hasOwnProperty(lang));

    if (!languages_valid) return await sock.sendMessage(from, {
        text: await decorate({
            emoji: "🌐",
            title: getString("translate/translate").toLowerCase(),
            content: [
                {
                    type: "list_complex",
                    padding: 1,
                    items: [
                        {
                            text: `${util.format(getString("translate/not_valid_languages"), util.format(getString("generic/info"), prefix, cmd))}`,
                            list_item_type: "simple_item"
                        }
                    ]
                }
            ]
        })
    }, { quoted: msg });

    const flag_string = langs.length === 1
        ? language_flags[langs[0]]
        : `${language_flags[langs[0]]} → ${language_flags[langs[1]]}`;

    const translation = langs.length === 1
        ? await translate(textToTranslate, { to: langs[0] })
        : await translate(textToTranslate, { from: langs[0], to: langs[1] });

    const useButtons = useEnhanced && (await getProp("use_buttons", false, from) === true);

    const copy_btn = (useButtons)
    ? [{
            text: `${getString("translate/copy_translation")}`,
            copy: `${translation.text}`
    }]
    : [];

    await sock.sendMessage(from, {
        text: await decorate({
            emoji: "🌐",
            title: getString("translate/translate").toLowerCase(),
            content: [
                {
                    type: "list_complex",
                    padding: 1,
                    items: [
                        {
                            emoji: `${flag_string}`,
                            text: `*“${translation.text}”*`,
                            list_item_type: "emoji_item"
                        }
                    ]
                }
            ]
        }), nativeFlow: copy_btn
    }, { quoted: msg });
}

module.exports = { run };