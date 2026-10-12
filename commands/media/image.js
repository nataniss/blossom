const util = require("util");
const sharp = require("sharp");

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
    const {
        sock,
        from,
        msg,
        args,
        getString,
        prefix,
        cmd
    } = ctx;

    if (args.length === 0) {
        await sock.sendMessage(from, {
            react: { text: '❌', key: msg.key }
        });

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
                            }
                        ]
                    }
                ]
            })
        }, { quoted: msg });
    }

    let queryArgs = [...args];
    let display_index = 1;

    const lastArg = queryArgs[queryArgs.length - 1];

    const indexMatch = lastArg
        ? lastArg.match(/^\[\[(\d+)\]\]$/)
        : null;

    if (indexMatch) {
        display_index = parseInt(indexMatch[1], 10);
        queryArgs.pop();
    }

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
                            }
                        ]
                    }
                ]
            })
        }, { quoted: msg });
    }

    await sock.sendMessage(from, {
        react: { text: '⌛', key: msg.key }
    });

    const query = queryArgs.join(" ");

    if (!sessionData['image_results']) {
        sessionData['image_results'] = {};
    }

    const cacheKey = query.trim().replace(/\s+/g, " ").toLowerCase();

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Referer": "https://www.bing.com/"
    };

    try {
        let image_urls = sessionData['image_results'][cacheKey];

        if (!Array.isArray(image_urls) || image_urls.length === 0) {
            const params = new URLSearchParams({
                q: query,
                form: "HDRSC2",
                first: "1",
                scenario: "ImageBasicHover",
                adlt: "strict"
            });

            const searchUrl =
                `https://www.bing.com/images/search?${params.toString()}`;

            const response = await fetch(searchUrl, {
                headers: headers,
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                await sock.sendMessage(from, {
                    react: { text: '❌', key: msg.key }
                });

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
                                    }
                                ]
                            }
                        ]
                    })
                }, { quoted: msg });
            }

            const html = await response.text();

            const regex = /class="iusc"[^>]*\bm="([^"]+)"/g;

            const urls = [];
            let match;

            while ((match = regex.exec(html)) !== null) {
                try {
                    const cleanJsonText = match[1]
                        .replace(/&quot;/g, '"')
                        .replace(/&#34;/g, '"')
                        .replace(/&amp;/g, '&')
                        .replace(/&#39;/g, "'")
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>');

                    const json = JSON.parse(cleanJsonText);

                    if (
                        json.murl &&
                        /^https?:\/\//i.test(json.murl)
                    ) {
                        urls.push(json.murl);
                    }
                } catch (e) {
                    
                }
            }

            const uniqueUrls = [...new Set(urls)];

            image_urls = uniqueUrls.filter(function (url) {
                const lower = url.toLowerCase();

                const excludedTerms = [
                    "svg",
                    "icon",
                    "clipart",
                    "coloring",
                    "dreamstime",
                    "shutterstock",
                    "istockphoto"
                ];

                for (let i = 0; i < excludedTerms.length; i++) {
                    if (lower.includes(excludedTerms[i])) {
                        return false;
                    }
                }

                return true;
            });

            sessionData['image_results'][cacheKey] = image_urls;
        }

        if (image_urls.length === 0) {
            await sock.sendMessage(from, {
                react: { text: '❌', key: msg.key }
            });

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
                                    text: `${util.format(
                                        getString("image_search/no_results_found"),
                                        query
                                    )}`,
                                    list_item_type: "simple_item"
                                }
                            ]
                        }
                    ]
                })
            }, { quoted: msg });
        }

        if (display_index > image_urls.length) {
            display_index = image_urls.length;
        }

        let url_index = display_index - 1;

        const useButtons =
            useEnhanced &&
            (await getProp("use_buttons", false, from) === true);

        let extra = "";

        const nextDisplayIndex = display_index + 1;

        const showButton =
            useButtons &&
            nextDisplayIndex <= image_urls.length;

        const reached_end =
            display_index >= image_urls.length;

        if (reached_end) {
            extra = `\n✋ ${getString("image_search/reached_end")}`;
        } else if (!useButtons) {
            extra = `\n⏩ ${util.format(
                getString("image_search/next"),
                `${prefix}${cmd} ${query} [[${nextDisplayIndex}]]`
            )}`;
        }

        const imageUrl = image_urls[url_index];

        const imageResponse = await fetch(imageUrl, {
            headers: {
                "User-Agent": headers["User-Agent"],
                "Referer": "https://www.bing.com/"
            },
            signal: AbortSignal.timeout(15000)
        });

        if (!imageResponse.ok) {
            throw new Error(
                `Image response error: HTTP ${imageResponse.status}`
            );
        }

        const contentType =
            imageResponse.headers.get("content-type") || "";

        if (!contentType.toLowerCase().startsWith("image/")) {
            throw new Error(
                `URL did not return an image: ${contentType || "unknown content type"}`
            );
        }

        let image_buffer = Buffer.from(
            await imageResponse.arrayBuffer()
        );

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

        await sock.sendMessage(from, {
            react: { text: '✅', key: msg.key }
        });

        const caption =
            `🔍 ${util.format(
                getString("image_search/results_for"),
                display_index,
                image_urls.length,
                `*“${query}”*`
            )}${extra}`;

        if (showButton) {
            await sock.sendMessage(from, {
                image: image_buffer,
                caption: caption,
                buttons: [
                    {
                        text: getString("image_search/next_photo"),
                        id: `${prefix}${cmd} ${query} [[${nextDisplayIndex}]]`
                    }
                ]
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, {
                image: image_buffer,
                caption: caption
            }, { quoted: msg });
        }

    } catch (error) {
        await sock.sendMessage(from, {
            react: { text: '❌', key: msg.key }
        });

        let image_urls = sessionData['image_results']?.[cacheKey] || [];
        let nextDisplayIndex = display_index + 1;
        
        const useButtons =
            useEnhanced &&
            (await getProp("use_buttons", false, from) === true);

        const showSkipButton =
            useButtons &&
            nextDisplayIndex <= image_urls.length;

        const reachedEndError = display_index >= image_urls.length;

        let errorMessage = "";
        let skipText = "";

        if (reachedEndError) {
            skipText = getString("image_search/reached_end_error");
        } else if (!useButtons) {
            skipText = util.format(
                getString("image_search/skip_text"),
                `${prefix}${cmd} ${query} [[${nextDisplayIndex}]]`
            );
        }

        errorMessage = `${util.format(
            getString("image_search/failed_to_get_image"),
            display_index,
            query
        )}`;

        if (skipText) {
            errorMessage += `\n${skipText}`;
        }

        let contentItems = [
            {
                text: errorMessage,
                list_item_type: "simple_item"
            }
        ];

        let msgOptions = {
            text: await decorate({
                emoji: "🔍",
                title: getString("image_search/image_search").toLowerCase(),
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: contentItems
                    }
                ]
            })
        };

        if (showSkipButton) {
            msgOptions.buttons = [
                {
                    text: getString("image_search/skip"),
                    id: `${prefix}${cmd} ${query} [[${nextDisplayIndex}]]`
                }
            ];
        }

        return await sock.sendMessage(from, msgOptions, { quoted: msg });
    }
}

module.exports = { run };