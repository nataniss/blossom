const cheerio = require('cheerio');
const util = require("util");
const sharp = require('sharp');

const {
    useEnhanced,
    sessionData
} = require("../../index.js");
const {
    getProp
} = require("../../helpers/prop_mgr.js");
const {
    decorate
} = require("../../helpers/decorator.js");

async function run(ctx) {
    const { sock, from, msg, args, getString, prefix, cmd } = ctx;

    if (!sessionData["image_results"]) sessionData["image_results"] = {} // wipp

    if (args.length === 0) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🔍",
                title: getString("image_search/image_search").toLowerCase(),
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: [
                            {
                                text: `${getString("generic/incorrect_syntax")}`,
                                list_item_type: "simple_item"
                            },
                        ]
                    }
                ]
            })
        });
    }

    let queryArgs = [...args];
    let display_index = 1; // Padrão começa em 1

    const lastArg = queryArgs[queryArgs.length - 1];
    const indexMatch = lastArg && lastArg.match(/^\[\[(\d+)\]\]$/);

    if (indexMatch) {
        display_index = parseInt(indexMatch[1], 10);
        queryArgs.pop();
    }

    // Se o usuário inserir 0 ou negativo, corrige para 1
    if (display_index < 1) {
        display_index = 1;
    }

    if (queryArgs.length === 0) {
        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🔍",
                title: getString("image_search/image_search").toLowerCase(),
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: [
                            {
                                text: `${getString("generic/incorrect_syntax")}`,
                                list_item_type: "simple_item"
                            },
                        ]
                    }
                ]
            })
        });
    }

    await sock.sendMessage(from, { react: { text: '⌛', key: msg.key } })

    const query = queryArgs.join(" ");

    const params = new URLSearchParams({
        q: query,
        first: 1
    });

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36"
    };

    try {
        const response = await fetch(`https://www.bing.com/images/search?${params.toString()}`, {
            headers: headers
        });

        if (!response.ok) {
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
            return await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🔍",
                    title: getString("image_search/image_search").toLowerCase(),
                    content: [
                        {
                            type: "list_complex",
                            padding: 1,
                            items: [
                                {
                                    text: `${getString("image_search/failed_to_get_results")}`,
                                    list_item_type: "simple_item"
                                },
                            ]
                        }
                    ]
                })
            }, { quoted: msg });
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const image_urls = [];

        $('.iusc').each((index, element) => {
            const mAttr = $(element).attr('m');
            if (mAttr) {
                try {
                    const imgUrl = JSON.parse(mAttr).murl;
                    if (imgUrl) {
                        image_urls.push(imgUrl);
                    }
                } catch (e) {

                }
            }
        });

        if (image_urls.length === 0) {
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })

            return await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🔍",
                    title: getString("image_search/image_search").toLowerCase(),
                    content: [
                        {
                            type: "list_complex",
                            padding: 1,
                            items: [
                                {
                                    text: `${util.format(getString("image_search/no_results_found"), query)}`,
                                    list_item_type: "simple_item"
                                },
                            ]
                        }
                    ]
                })
            }, { quoted: msg });
        }

        // Garante que o índice exibido não passe do total de imagens
        if (display_index > image_urls.length) {
            display_index = image_urls.length;
        }

        // Converte o índice de exibição (base 1) para o índice real do array (base 0)
        let url_index = display_index - 1;

        const useButtons = useEnhanced && (await getProp("use_buttons", false, from) === true)

        let extra = ""

        const nextDisplayIndex = display_index + 1;
        const showButton = useButtons && (nextDisplayIndex <= image_urls.length);

        const reached_end = (display_index >= image_urls.length);

        if (reached_end) {
            extra = `\n✋ ${getString("image_search/reached_end")}`;
        } else if (!useButtons) {
            extra = `\n⏩ ${util.format(getString("image_search/next"), `${prefix}${cmd} ${query} [[${nextDisplayIndex}]]`)}`;
        }

        const image_response = await fetch(image_urls[url_index])
        if (!image_response.ok) throw new Error("Image buffer response error");

        let image_buffer = Buffer.from(await image_response.arrayBuffer())

        if (!image_buffer || image_buffer.length === 0) {
            throw new Error("Image buffer empty");
        }

        try {
            image_buffer = await sharp(image_buffer)
                .jpeg({ quality: 85 })
                .toBuffer();
        } catch (sharpError) {
            console.error("Sharp error!", sharpError);
        }

        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } })

        if (showButton) {
            await sock.sendMessage(from, {
                image: image_buffer,
                caption: `🔍 ${util.format(getString("image_search/results_for"), display_index, image_urls.length, `*“${query}”*`)}${extra}`,
                buttons: [{
                    text: getString("image_search/next_photo"),
                    id: `${prefix}${cmd} ${query} [[${nextDisplayIndex}]]`
                }]
            }, { quoted: msg })
        } else {
            await sock.sendMessage(from, {
                image: image_buffer,
                caption: `🔍 ${util.format(getString("image_search/results_for"), display_index, image_urls.length, `*“${query}”*`)}${extra}`
            }, { quoted: msg });
        }

    } catch (error) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })

        console.error(error)

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🔍",
                title: getString("image_search/image_search").toLowerCase(),
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: [
                            {
                                text: `${util.format(getString("image_search/failed_to_get_results"), query)}`,
                                list_item_type: "simple_item"
                            },
                        ]
                    }
                ]
            })
        }, { quoted: msg });
    }
}

module.exports = { run };