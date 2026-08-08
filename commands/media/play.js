const { useEnhanced } = require("../../index.js")
const { getProp } = require("../../helpers/prop_mgr.js")
const { exec } = require('child_process');
const util = require('util');
const { decorate } = require("../../helpers/decorator.js");

const execPromise = util.promisify(exec);

function buildSelection(videoList, ctx) {

    const videoList_sliced = videoList.slice(1)

    /*
    {
        text: '📋 Select',
        sections: [{
            title: '✨ Section 1',
            rows: [{
                header: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                title: '💭 Secret Ingredient',
                description: '',
                id: '#SecretIngredient'
            }]
        }, {
            title: '✨ Section 2',
            highlight_label: '🔥 Popular',
            rows: [{
                header: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                title: '🏷️ Coupon',
                description: '',
                id: '#CouponCode'
            }]
        }]
    }*/

    let result = {
        text: ctx.getString("play/other_vids"),
        sections: []
    }

    videoList_sliced.forEach((vid, index) => {
        result.sections.push(
            {
                title: util.format(ctx.getString("play/by"), vid.uploader),
                rows: [{
                    header: '',
                    title: `${vid.title}`,
                    description: ctx.getString("play/download_audio"),
                    id: `${ctx.prefix}play ${vid.url}`
                }, {
                    header: '',
                    title: `${vid.title}`,
                    description: ctx.getString("play/download_video"),
                    id: `${ctx.prefix}play_video ${vid.url}`
                }]
            }
        )
    })

    return result;
}

async function run(ctx) {
    const { sock, from, msg, getString, cmd, args } = ctx;

    return sock.sendMessage(from, {
                react: {
                    text: "🔍",
                    key: msg.key
                }
            })

    const { stdout, stderr } = await execPromise(
        `yt-dlp --quiet --no-update --no-warnings --dump-json "ytsearch6:${args.join(" ")}"`,
        { maxBuffer: 1024 * 1024 * 20 }
    );

    if (stderr && !stdout) {
        throw new Error(stderr);
    }

    const lines = stdout.trim().split("\n").filter(line => line.trim().length > 0);

    const videosData = lines.map(line => JSON.parse(line));

    const videoList = videosData.map(video => ({
        title: video.title,
        url: video.webpage_url || video.url,
        duration: video.duration_string || video.duration,
        uploader: video.uploader,
        thumbnail: video.thumbnail
    }));

    console.log(videoList);

    const useButtons = useEnhanced && (await getProp("use_buttons", false, from) === true)

    if (useButtons) {

        const selection = buildSelection(videoList, ctx)

        await sock.sendMessage(from, {
            image: {
                url: videoList[0].thumbnail
            },
            caption: await decorate({
                emoji: "🎵",
                title: getString("play/play").toLowerCase(),
                content: [
                    {
                            type: "text",
                            padding_end: 1,
                            items: [
                                `*${videoList[0].title}*`
                            ]
                        },
                    {
                        type: "list_complex",
                        padding: 1,
                        items: [
                            {
                                emoji: "⏳",
                                text: `*${getString("play/duration")}:* ${videoList[0].duration}`,
                                list_item_type: "emoji_item"
                            },
                            {
                                emoji: "👤",
                                text: `*${getString("play/author")}:* ${videoList[0].uploader}`,
                                list_item_type: "emoji_item"
                            },
                        ]
                    }
                ]
            }),
            footer: ctx.getString("play/enhanced_footer"),
            buttons: [{
                text: getString("play/download_as_audio"),
                id: `${ctx.prefix}play ${videoList[0].url}`
            },
            {
                text: getString("play/download_as_video"),
                id: `${ctx.prefix}play_video ${videoList[0].url}`
            }, selection]
        }, {
            quoted: msg
        })
    }

    // ...downloading routine..
}

module.exports = { run }