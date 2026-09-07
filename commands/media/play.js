const {
    useEnhanced
} = require("../../index.js");
const {
    getProp
} = require("../../helpers/prop_mgr.js");
const {
    exec
} = require("child_process");
const util = require("util");
const {
    decorate
} = require("../../helpers/decorator.js");
const {
    rm
} = require("node:fs/promises");
const {
    execSync
} = require("child_process");
const os = require("os");
const execPromise = util.promisify(exec);

function formatDuration(durationStr) {
    if (durationStr.length < 3) {
        if (durationStr.length == 1) {
            return `0:0${durationStr}`
        } else {
             return `0:${durationStr}`
        }
    } else {
        return durationStr;
    }
}

function convertDate(dateStr) {
  const yyyy = dateStr.substring(0, 4);
  const mm = dateStr.substring(4, 6);
  const dd = dateStr.substring(6, 8);

  return `${dd}/${mm}/${yyyy}`;
}

function isCommandAvailable(command) {
    const isWin = os.platform() === "win32";
    const checkCommand = isWin ? `where ${command}` : `command -v ${command}`;
    try {
        execSync(checkCommand, {
            stdio: "ignore"
        });
        return true;
    } catch (e) {
        return false;
    }
}

function buildSelection(videoList, ctx) {
    const videoList_sliced = videoList.slice(1);
    let result = {
        text: ctx.getString("play/other_vids"),
        sections: []
    };
    videoList_sliced.forEach((vid) => {
        result.sections.push({
            title: util.format(ctx.getString("play/by"), vid.uploader),
            rows: [{
                header: "",
                title: `${vid.title}`,
                description: ctx.getString("play/download_audio"),
                id: `${ctx.prefix}play ${vid.url}`
            }, {
                header: "",
                title: `${vid.title}`,
                description: ctx.getString("play/download_video"),
                id: `${ctx.prefix}play_video ${vid.url}`
            }]
        });
    });
    return result;
}
async function run(ctx) {
    const {
        sock,
        from,
        msg,
        getString,
        args
    } = ctx;
    if (!isCommandAvailable("yt-dlp") || !isCommandAvailable("ffmpeg")) {

        await sock.sendMessage(from, {
            react: {
                text: "❌",
                key: msg.key
            }
        });

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🎵",
                title: getString("play/play").toLowerCase(),
                content: [{
                    type: "text",
                    items: [getString("play/no_binaries_found")]
                }]
            })
        }, {
            quoted: msg
        });
    }
    const query = args.join(" ").trim();
    if (!query) {
        return;
    }
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((?:\w|-){11})(?:\S+)?$/;
    const useButtons = useEnhanced && (await getProp("use_buttons", false, from) === true);
    if (youtubeRegex.test(query)) {
        await sock.sendMessage(from, {
            react: {
                text: "⌛️",
                key: msg.key
            }
        });
        await sock.sendMessage(from, {
            text: `⌛️ ${getString("play/downloading")}`
        }, {
            quoted: msg
        });
        const name_desc = Math.random().toString(36).substring(2, 10);
        const outputFile = ctx.cmd === "play_video" ? `video-${name_desc}.mp4` : `video-${name_desc}.opus`;
        try {
            const {
                stdout,
                stderr
            } = await execPromise(ctx.cmd === "play_video" ? `yt-dlp --quiet --no-update --no-warnings -f "bv*[vcodec^=avc]+ba[acodec^=mp4a]/b[ext=mp4]/bv*+ba/b" --recode-video mp4 --postprocessor-args "ffmpeg:-movflags +faststart" -o "${outputFile}" "${query}"` : `yt-dlp --quiet --no-update --no-warnings -x --audio-quality 5 --audio-format opus -o "${outputFile}" "${query}"`, {
                maxBuffer: 1024 * 1024 * 20
            });
            if (stderr && !stdout) {
                throw new Error(stderr);
            }
            if (ctx.cmd === "play_video") {
                await sock.sendMessage(from, {
                    video: {
                        url: `./${outputFile}`
                    },
                    mimetype: "video/mp4"
                }, {
                    quoted: msg
                });
            } else {
                await sock.sendMessage(from, {
                    audio: {
                        url: `./${outputFile}`
                    },
                    mimetype: "audio/ogg; codecs=opus"
                }, {
                    quoted: msg
                });
            }
        } finally {
            await rm(`./${outputFile}`, {
                force: true
            });
        }
        return;
    }
    await sock.sendMessage(from, {
        react: {
            text: "🔍",
            key: msg.key
        }
    });
    const searchAmount = useButtons ? 6 : 1;
    const {
        stdout,
        stderr
    } = await execPromise(`yt-dlp --quiet --no-update --no-warnings --dump-json "ytsearch${searchAmount}:${query}"`, {
        maxBuffer: 1024 * 1024 * 20
    });
    if (stderr && !stdout) {
        throw new Error(stderr);
    }
    const lines = stdout.trim().split("\n").filter((line) => line.trim().length > 0);
    const videosData = lines.map((line) => JSON.parse(line));
    const videoList = videosData.map((video) => ({
        title: video.title,
        url: video.webpage_url || video.url,
        duration: video.duration_string || video.duration,
        uploader: video.uploader,
        thumbnail: video.thumbnail,
        views: video.view_count,
        description: video.description,
        likes: video.like_count,
        uploadDate: video.upload_date
    }));
    if (videoList.length === 0) {
        return;
    }
    await sock.sendMessage(from, {
        react: {
            text: "✅️",
            key: msg.key
        }
    });
    if (!useButtons) {
        const formatter = new Intl.NumberFormat('en', { 
            notation: 'compact', 
            maximumFractionDigits: 1 
        });


        const video = videoList[0];
        const caption = await decorate({
            emoji: "🎵",
            title: getString("play/play").toLowerCase(),
            content: [{
                type: "text",
                padding_end: 1,
                items: [`*${video.title}*`]
            }, {
                type: "list_complex",
                padding: 1,
                items: [{
                    emoji: "⏳",
                    text: `*${getString("play/duration")}:* ${formatDuration(video.duration)}`,
                    list_item_type: "emoji_item"
                }, {
                    emoji: "👤",
                    text: `*${getString("play/author")}:* ${video.uploader}`,
                    list_item_type: "emoji_item"
                }, {
                    emoji: "ℹ️",
                    text: `*${getString("play/uploaded")}:* ${convertDate(videoList[0].uploadDate)}`,
                    list_item_type: "emoji_item"
                }, {
                    emoji: "👍",
                    text: `*${getString("play/likes")}:* ${formatter.format(videoList[0].likes) ?? "N/A"}`,
                    list_item_type: "emoji_item"
                }, {
                    emoji: "👁",
                    text: `*${getString("play/views")}:* ${formatter.format(videoList[0].views) ?? "N/A"}`,
                    list_item_type: "emoji_item"
                }]
            }]
        });
        await sock.sendMessage(from, {
            image: {
                url: video.thumbnail
            },
            caption
        }, {
            quoted: msg
        });
        await sock.sendMessage(from, {
            text: `⌛️ ${getString("play/downloading")}`
        }, {
            quoted: msg
        });
        const name_desc = Math.random().toString(36).substring(2, 10);
        const outputFile = ctx.cmd === "play_video" ? `video-${name_desc}.mp4` : `video-${name_desc}.opus`;
        try {
            const {
                stdout,
                stderr
            } = await execPromise(ctx.cmd === "play_video" ? `yt-dlp --quiet --no-update --no-warnings -f "bv*[vcodec^=avc]+ba[acodec^=mp4a]/b[ext=mp4]/bv*+ba/b" --recode-video mp4 --postprocessor-args "ffmpeg:-movflags +faststart" -o "${outputFile}" "${video.url}"` : `yt-dlp --quiet --no-update --no-warnings -x --audio-quality 5 --audio-format opus -o "${outputFile}" "${video.url}"`, {
                maxBuffer: 1024 * 1024 * 20
            });
            if (stderr && !stdout) {
                throw new Error(stderr);
            }
            if (ctx.cmd === "play_video") {
                await sock.sendMessage(from, {
                    video: {
                        url: `./${outputFile}`
                    },
                    mimetype: "video/mp4"
                }, {
                    quoted: msg
                });
            } else {
                await sock.sendMessage(from, {
                    audio: {
                        url: `./${outputFile}`
                    },
                    mimetype: "audio/ogg; codecs=opus"
                }, {
                    quoted: msg
                });
            }
        } finally {
            await rm(`./${outputFile}`, {
                force: true
            });
        }
        return;
    }

    const selection = buildSelection(videoList, ctx);

    const formatter = new Intl.NumberFormat('en', { 
        notation: 'compact', 
        maximumFractionDigits: 1 
    });

    await sock.sendMessage(from, {
        image: {
            url: videoList[0].thumbnail
        },
        caption: await decorate({
            emoji: "🎵",
            title: getString("play/play").toLowerCase(),
            content: [{
                type: "text",
                padding_end: 1,
                items: [`*${videoList[0].title}*`]
            }, {
                type: "list_complex",
                padding: 1,
                items: [{
                    emoji: "⏳",
                    text: `*${getString("play/duration")}:* ${formatDuration(videoList[0].duration)}`,
                    list_item_type: "emoji_item"
                }, {
                    emoji: "👤",
                    text: `*${getString("play/author")}:* ${videoList[0].uploader}`,
                    list_item_type: "emoji_item"
                }, {
                    emoji: "ℹ️",
                    text: `*${getString("play/uploaded")}:* ${convertDate(videoList[0].uploadDate)}`,
                    list_item_type: "emoji_item"
                }, {
                    emoji: "👍",
                    text: `*${getString("play/likes")}:* ${formatter.format(videoList[0].likes) ?? "N/A"}`,
                    list_item_type: "emoji_item"
                }, {
                    emoji: "👁",
                    text: `*${getString("play/views")}:* ${formatter.format(videoList[0].views) ?? "N/A"}`,
                    list_item_type: "emoji_item"
                }]
            }]
        }),
        footer: ctx.getString("play/enhanced_footer"),
        buttons: [{
            text: getString("play/download_as_audio"),
            id: `${ctx.prefix}play ${videoList[0].url}`
        }, {
            text: getString("play/download_as_video"),
            id: `${ctx.prefix}play_video ${videoList[0].url}`
        }, selection]
    }, {
        quoted: msg
    });
}
module.exports = {
    run
};