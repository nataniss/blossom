const useEnhanced = require('../../index.js').useEnhanced;

const libPath = useEnhanced ? '@itsliaaa/baileys' : '@whiskeysockets/baileys';

const { downloadMediaMessage } = require(libPath);
const {
    execSync
} = require("child_process");

const {
    exec
} = require("child_process");

const os = require("os");
const {
    rm
} = require("node:fs/promises");

const {
    getProp
} = require("../../helpers/prop_mgr.js");

const {
    decorate
} = require("../../helpers/decorator.js");

const util = require("util");

const execPromise = util.promisify(exec);

const {
    writeFile,
    readFile
} = require('fs/promises');

const WebP = require('node-webpmux');

async function addStickerExif(webpBuffer, ids) {
    const img = new WebP.Image();

    const json = {
        'sticker-pack-id': ids.pack_id,
        'sticker-pack-name': ids.name,
        'sticker-pack-publisher': ids.author,
        'emojis': ['']
    };

    const exifHeader = Buffer.from([
        0x49, 0x49, 0x2A, 0x00,
        0x08, 0x00, 0x00, 0x00,
        0x01, 0x00,
        0x41, 0x57,
        0x07, 0x00,
        0x00, 0x00,
        0x00, 0x00,
        0x16, 0x00,
        0x00, 0x00
    ]);

    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');

    const exif = Buffer.concat([
        exifHeader,
        jsonBuffer
    ]);

    exif.writeUIntLE(jsonBuffer.length, 14, 4);

    await img.load(webpBuffer);

    img.exif = exif;

    return await img.save(null);
}

function isCommandAvailable(command) {
    const isWin = os.platform() === "win32";
    const checkCommand = isWin
        ? `where ${command}`
        : `command -v ${command}`;

    try {
        execSync(checkCommand, {
            stdio: "ignore"
        });

        return true;
    } catch (e) {
        return false;
    }
}

async function getMediaDuration(input) {
    try {
        const {
            stderr
        } = await execPromise(
            `ffmpeg -hide_banner -i "${input}" -f null -`,
            {
                maxBuffer: 1024 * 1024 * 20
            }
        );

        const output = stderr || "";

        const match = output.match(
            /Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/i
        );

        if (!match) {
            return null;
        }

        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        const seconds = Number(match[3]);

        return (hours * 3600) + (minutes * 60) + seconds;
    } catch (e) {
        const output = `${e.stderr || ""}\n${e.stdout || ""}`;

        const match = output.match(
            /Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/i
        );

        if (!match) {
            return null;
        }

        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        const seconds = Number(match[3]);

        return (hours * 3600) + (minutes * 60) + seconds;
    }
}


async function compressWebP({
    input,
    output,
    animated,
    commandMode,
    maxBytes
}) {
    const qualities = animated
        ? [50, 55, 60, 65, 70, 75, 80, 85, 90, 95]
        : [70, 75, 80, 85, 90, 95];

    let lastSize = Infinity;

    for (const quality of qualities) {
        let videoFilter;

        if (animated) {
            if (commandMode === "sz") {
                videoFilter =
                    `fps=12,` +
                    `scale='if(gt(iw,ih),-1,512)':'if(gt(iw,ih),512,-1)',` +
                    `crop=512:512`;

            } else if (commandMode === "sr") {
                videoFilter =
                    `fps=12,` +
                    `scale='iw*min(512/iw\\,512/ih)':'ih*min(512/iw\\,512/ih)',` +
                    `pad=512:512:(512-iw)/2:(512-ih)/2:color=0x00000000`;

            } else {
                videoFilter =
                    `fps=12,scale=512:512`;
            }

        } else if (commandMode === "sz") {
            videoFilter =
                `scale='if(gt(iw,ih),-1,512)':'if(gt(iw,ih),512,-1)',` +
                `crop=512:512`;

        } else if (commandMode === "sr") {
            videoFilter =
                `scale='iw*min(512/iw\\,512/ih)':'ih*min(512/iw\\,512/ih)',` +
                `pad=512:512:(512-iw)/2:(512-ih)/2:color=0x00000000`;

        } else {
            videoFilter = `scale=512:512`;
        }

        let command;

        if (animated) {
            command =
                `ffmpeg -y -hide_banner -loglevel error ` +
                `-i "${input}" ` +
                `-t 9.9 ` +
                `-vf "${videoFilter}" ` +
                `-an ` +
                `-c:v libwebp ` +
                `-lossless 0 ` +
                `-compression_level 6 ` +
                `-q:v ${quality} ` +
                `-loop 0 ` +
                `"${output}"`;
        } else {
            command =
                `ffmpeg -y -hide_banner -loglevel error ` +
                `-i "${input}" ` +
                `-vf "${videoFilter}" ` +
                `-frames:v 1 ` +
                `-an ` +
                `-c:v libwebp ` +
                `-lossless 0 ` +
                `-compression_level 6 ` +
                `-q:v ${quality} ` +
                `"${output}"`;
        }

        await execPromise(command, {
            maxBuffer: 1024 * 1024 * 20
        });

        const result = await readFile(output);

        lastSize = result.length;

        if (result.length < maxBytes) {
            return result;
        }
    }

    return await readFile(output);
}

async function run(ctx) {
    const {
        sock,
        from,
        msg,
        getString,
        args
    } = ctx;

    if (!isCommandAvailable("ffmpeg")) {
        await sock.sendMessage(from, {
            react: {
                text: "❌",
                key: msg.key
            }
        });

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🖼️",
                title: getString("sticker/sticker").toLowerCase(),
                content: [{
                    type: "text",
                    items: [getString("sticker/no_binaries_found")]
                }]
            })
        }, {
            quoted: msg
        });
    }

    const messageType = Object.keys(msg.message)[0];
    const message = msg.message[messageType];
    const contextInfo = message?.contextInfo;

    let mediaMessage = null;
    let mediaMessagePayload = null;
    let isAnimated = false;

    const quotedMessage = contextInfo?.quotedMessage;

    if (quotedMessage?.imageMessage) {
        mediaMessage = quotedMessage.imageMessage;

        mediaMessagePayload = {
            message: quotedMessage
        };

        isAnimated = false;
    } else if (quotedMessage?.videoMessage) {
        mediaMessage = quotedMessage.videoMessage;

        mediaMessagePayload = {
            message: quotedMessage
        };

        isAnimated = true;
    }

    if (messageType === 'imageMessage' && message) {
        mediaMessage = message;

        mediaMessagePayload = {
            message: msg.message
        };

        isAnimated = false;
    } else if (messageType === 'videoMessage' && message) {
        mediaMessage = message;

        mediaMessagePayload = {
            message: msg.message
        };

        isAnimated = true;
    }

    if (!mediaMessage || !mediaMessagePayload) {
        await sock.sendMessage(from, {
            react: {
                text: "❌",
                key: msg.key
            }
        });

        await sock.sendMessage(from, {
            text: `❌ ${util.format(
                getString("sticker/error_no_input"),
                ctx.prefix,
                ctx.cmd
            )}`
        }, {
            quoted: msg
        });

        return;
    }

    await sock.sendMessage(from, {
        react: {
            text: "⌛️",
            key: msg.key
        }
    });

    const buffer = await downloadMediaMessage(
        mediaMessagePayload,
        'buffer',
        {},
        {
            logger: sock.logger,
            reuploadRequest: sock.updateMediaMessage
        }
    );

    const randomId = Math.random()
        .toString(36)
        .substring(2, 10);

    const before = `sticker_before_${randomId}${isAnimated ? ".media" : ".jpg"}`;
    const after = `sticker_after_${randomId}.webp`;

    const maxBytes = isAnimated
        ? 500 * 1024
        : 100 * 1024;

    try {
        await writeFile(before, buffer);

        if (isAnimated) {
            const duration = await getMediaDuration(before);

            if (duration !== null && duration > 9.9) {
                await sock.sendMessage(from, {
                    react: {
                        text: "❌",
                        key: msg.key
                    }
                });

                await sock.sendMessage(from, {
                    text: `❌ ${await getString("sticker/duration_not_permitted")}`
                }, {
                    quoted: msg
                });

                return;
            }
        }

        const webpBuffer = await compressWebP({
            input: before,
            output: after,
            animated: isAnimated,
            commandMode: ctx.cmd,
            maxBytes
        });

        if (webpBuffer.length >= maxBytes) {
            await sock.sendMessage(from, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            });

            await sock.sendMessage(from, {
                text: `❌ ${getString("sticker/error_compressing")}`
            }, {
                quoted: msg
            });

            return;
        }

        const attachGroupName = await getProp(
            "stickers_attach_group_name",
            false,
            from
        );

        let group_name = "";

        if (attachGroupName) {
            const metadata = await sock.groupMetadata(from);
            group_name = metadata.subject;
        }

        const author_name =
            (attachGroupName && group_name !== "")
                ? group_name
                : await getProp("bot_name", false, from);

        const stickerBuffer = await addStickerExif(
            webpBuffer,
            {
                pack_id: 'com.blossom.bot',
                name: ctx.username,
                author: author_name
            }
        );

        if (stickerBuffer.length >= maxBytes) {
            await sock.sendMessage(from, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            });

            await sock.sendMessage(from, {
                text: `❌ ${getString("sticker/error_adding_exif")}`
            }, {
                quoted: msg
            });

            return;
        }

        await sock.sendMessage(from, {
            react: {
                text: "✅",
                key: msg.key
            }
        });

        await sock.sendMessage(
            from,
            {
                sticker: stickerBuffer,
                isAnimated
            },
            {
                quoted: msg
            }
        );
    } finally {
        await rm(`./${before}`, {
            force: true
        });

        await rm(`./${after}`, {
            force: true
        });
    }
}

module.exports = {
    run
};
