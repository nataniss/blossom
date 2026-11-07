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
    rm,
    readdir
} = require("node:fs/promises");
const { join, dirname, basename } = require('path');
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

async function deleteTempFiles(outputFile) {
    const filePath = `./${outputFile}`;
    const dir = dirname(filePath);
    const prefix = basename(filePath);

    const files = await readdir(dir);

    for (const file of files) {
        if (file.startsWith(prefix)) {
            await rm(join(dir, file), { force: true });
        }
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
        cmd,
        args,
        prefix
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
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: [
                            {
                                text: `${getString(`play/no_query`)}`,
                                list_item_type: "simple_item"
                            },
                            {
                                text: `${util.format(getString(`play/example`), prefix, cmd, getString("play/example_song"))}`,
                                list_item_type: "simple_item"
                            },
                            {
                                text: `${util.format(getString(`play/example`), prefix, cmd, getString("play/example_link"))}`,
                                list_item_type: "simple_item"
                            }
                        ]
                    }
                ]
            })
        }, { quoted: msg });
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
        /*
        await sock.sendMessage(from, {
                    text: `⌛️ ${getString("play/downloading")}`
                }, {
                    quoted: msg
                });
        */
        const name_desc = Math.random().toString(36).substring(2, 10);
        const outputExt = ctx.cmd === "play_video" ? `.mp4` : `.opus`
        const outputFile = `video-${name_desc}`
        try {
            const {
                stdout,
                stderr
            } = await execPromise(ctx.cmd === "play_video" ? `yt-dlp --quiet --no-update --no-warnings -f "bv*[vcodec^=avc]+ba[acodec^=mp4a]/b[ext=mp4]/bv*+ba/b" --recode-video mp4 --postprocessor-args "ffmpeg:-movflags +faststart" -o "${outputFile}${outputExt}" "${query}"` : `yt-dlp --quiet --no-update --no-warnings -x --audio-quality 5 --audio-format opus -o "${outputFile}${outputExt}" "${query}"`, {
                maxBuffer: 1024 * 1024 * 20,
                timeout: 300000
            });
            if (stderr && !stdout) {
                throw new Error(stderr);
            }

            await sock.sendMessage(from, {
                react: {
                    text: "✅️",
                    key: msg.key
                }
            });

            if (ctx.cmd === "play_video") {
                await sock.sendMessage(from, {
                    video: {
                        url: `./${outputFile}${outputExt}`
                    },
                    mimetype: "video/mp4"
                }, {
                    quoted: msg
                });
            } else {
                await sock.sendMessage(from, {
                    audio: {
                        url: `./${outputFile}${outputExt}`
                    },
                    mimetype: "audio/ogg; codecs=opus"
                }, {
                    quoted: msg
                });
            }
        } catch (error) {
            
            const errorMsg = error.stderr || error.message || ''

            const isMediaTooLarge = errorMsg.includes('Media upload failed')
            const isLinkInvalid = errorMsg.includes('unavailable') || errorMsg.includes('Private video')
            const isAgeRestricted = errorMsg.includes('Sign in to confirm your age')
            const isTimeout = error.signal === 'SIGTERM'
            const isYoutubeBlock = /bot|HTTP Error 403/i.test(errorMsg)

            let errorString = getString("play/generic_error")

            if (isMediaTooLarge) {
                errorString = getString("play/too_large_error")
            } else if (isLinkInvalid) {
                errorString = getString("play/link_invalid_error")
            } else if (isAgeRestricted) {
                errorString = getString("play/age_restricted_error")
            } else if (isTimeout) {
                errorString = getString("play/timeout_error")
            } else if (isYoutubeBlock) {
                errorString = getString("play/blocked_error")
            }

            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎵",
                    title: getString("play/play").toLowerCase(),
                    content: [
                        {
                            type: "list_complex",
                            padding: 1,
                            items: [
                                {
                                    text: `*${getString("play/dl_error")}*: ${errorString}`,
                                    list_item_type: "simple_item"
                                },
                                {
                                    text: `*${getString("play/try_again")}*`,
                                    list_item_type: "simple_item"
                                }
                            ]
                        }
                    ]
                })
            }, { quoted: msg })
        } finally {
            await deleteTempFiles(outputFile)
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
    let stdout;

    try {
        const result = await execPromise(`yt-dlp --quiet --no-update --no-warnings --dump-json "ytsearch${searchAmount}:${query}"`, {
            maxBuffer: 1024 * 1024 * 20,
            timeout: 300000
        });

        stdout = result.stdout;
        const stderr = result.stderr;

        if (stderr && !stdout) {
            throw new Error(stderr);
        }
    } catch (err) {
        const errorMsg = err.stderr || err.message || '';

        const isLinkInvalid = errorMsg.includes('unavailable') || errorMsg.includes('Private video');
        const isAgeRestricted = errorMsg.includes('Sign in to confirm your age');
        const isTimeout = err.signal === 'SIGTERM';
        const isYoutubeBlock = /bot|HTTP Error 403/i.test(errorMsg);

        let errorString = getString("play/search_generic_error");

        if (isLinkInvalid) {
            errorString = getString("play/search_link_invalid_error");
        } else if (isAgeRestricted) {
            errorString = getString("play/search_age_restricted_error");
        } else if (isTimeout) {
            errorString = getString("play/search_timeout_error");
        } else if (isYoutubeBlock) {
            errorString = getString("play/search_blocked_error");
        }

        await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🎵",
                title: getString("play/play").toLowerCase(),
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: [
                            {
                                text: `*${getString("play/search_error")}*: ${errorString}`,
                                list_item_type: "simple_item"
                            },
                            {
                                text: `*${getString("play/try_again")}*`,
                                list_item_type: "simple_item"
                            }
                        ]
                    }
                ]
            })
        }, { quoted: msg });

        return;
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
        /*
        await sock.sendMessage(from, {
                    text: `⌛️ ${getString("play/downloading")}`
                }, {
                    quoted: msg
                });
        */
        const name_desc = Math.random().toString(36).substring(2, 10);
        const outputFile = `video-${name_desc}`;
        const outputExt = ctx.cmd === "play_video" ? `.mp4` : `.opus`;
        try {
            const {
                stdout,
                stderr
            } = await execPromise(ctx.cmd === "play_video" ? `yt-dlp --quiet --no-update --no-warnings -f "bv*[vcodec^=avc]+ba[acodec^=mp4a]/b[ext=mp4]/bv*+ba/b" --recode-video mp4 --postprocessor-args "ffmpeg:-movflags +faststart" -o "${outputFile}${outputExt}" "${video.url}"` : `yt-dlp --quiet --no-update --no-warnings -x --audio-quality 5 --audio-format opus -o "${outputFile}${outputExt}" "${video.url}"`, {
                maxBuffer: 1024 * 1024 * 20,
                timeout: 300000
            });
            if (stderr && !stdout) {
                throw new Error(stderr);
            }
            if (ctx.cmd === "play_video") {
                await sock.sendMessage(from, {
                    video: {
                        url: `./${outputFile}${outputExt}`
                    },
                    mimetype: "video/mp4"
                }, {
                    quoted: msg
                });
            } else {
                await sock.sendMessage(from, {
                    audio: {
                        url: `./${outputFile}${outputExt}`
                    },
                    mimetype: "audio/ogg; codecs=opus"
                }, {
                    quoted: msg
                });
            }
        } catch (error) {
            const errorMsg = error.stderr || error.message || ''

            const isMediaTooLarge = errorMsg.includes('Media upload failed')
            const isLinkInvalid = errorMsg.includes('unavailable') || errorMsg.includes('Private video')
            const isAgeRestricted = errorMsg.includes('Sign in to confirm your age')
            const isTimeout = error.signal === 'SIGTERM'
            const isYoutubeBlock = /bot|HTTP Error 403/i.test(errorMsg)

            let errorString = getString("play/generic_error")

            if (isMediaTooLarge) {
                errorString = getString("play/too_large_error")
            } else if (isLinkInvalid) {
                errorString = getString("play/link_invalid_error")
            } else if (isAgeRestricted) {
                errorString = getString("play/age_restricted_error")
            } else if (isTimeout) {
                errorString = getString("play/timeout_error")
            } else if (isYoutubeBlock) {
                errorString = getString("play/blocked_error")
            }

            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎵",
                    title: getString("play/play").toLowerCase(),
                    content: [
                        {
                            type: "list_complex",
                            padding: 1,
                            items: [
                                {
                                    text: `*${getString("play/dl_error")}*: ${errorString}`,
                                    list_item_type: "simple_item"
                                },
                                {
                                    text: `*${getString("play/try_again")}*`,
                                    list_item_type: "simple_item"
                                }
                            ]
                        }
                    ]
                })
            }, { quoted: msg })
        } finally {
            await deleteTempFiles(await deleteTempFiles(outputFile));
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