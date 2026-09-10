const util = require("util");
const { Readable } = require("stream");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const useEnhanced = require('../../index.js').useEnhanced;
const libPath = useEnhanced ? '@itsliaaa/baileys' : '@whiskeysockets/baileys';
const { downloadMediaMessage } = require(libPath);
const { Image } = require("node-webpmux");

async function convertWebPToMP4(streamIn) {
    const gifBuffer = await sharp(streamIn, { animated: true })
        .toFormat('gif')
        .toBuffer();

    return new Promise((resolve, reject) => {
        const inputStream = new Readable();
        inputStream.push(gifBuffer);
        inputStream.push(null);

        const chunks = [];

        ffmpeg(inputStream)
            .inputFormat('gif')
            .outputOptions([
                '-movflags frag_keyframe+empty_moov',
                '-pix_fmt yuv420p',
                '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2'
            ])
            .toFormat('mp4')
            .on('error', (err) => reject(err))
            .pipe()
            .on('data', (chunk) => chunks.push(chunk))
            .on('end', () => resolve(Buffer.concat(chunks)));
    });
}

async function downloadandSendSticker(quotedMessageStructure, ctx) {
    const {
        sock,
        from,
        msg,
        getString,
        args,
        cmd
    } = ctx;

    await sock.sendMessage(from, {
        react: {
            text: "⌛️",
            key: msg.key
        }
    });

    const fakeMessageContainer = {
        key: {},
        message: {
            stickerMessage: quotedMessageStructure.stickerMessage
        }
    };

    const stream = await downloadMediaMessage(
        fakeMessageContainer,
        'buffer',
        {}
    );

    const s = new Image();
    await s.load(stream);

    const isAnimated = s.hasAnim;

    if (isAnimated) {
        if (cmd == "toimg") {
            await sock.sendMessage(from, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            });
            return await sock.sendMessage(from, {
                text: `❌ ${util.format(getString("sticker_convert/not_static"), ctx.prefix, "togif", ctx.prefix, "tovid")}`
            }, {
                quoted: msg
            });
        } else {
            try {
                await sock.sendMessage(from, {
                    text: `⌛️ ${util.format(getString("sticker_convert/please_wait"), (cmd == "togif") ? getString("sticker_convert/a_gif") : getString("sticker_convert/a_video"))}`
                }, {
                    quoted: msg
                });

                const stream_out = await convertWebPToMP4(stream);

                await sock.sendMessage(from, {
                    react: {
                        text: "✅",
                        key: msg.key
                    }
                });

                await sock.sendMessage(from, {
                    video: stream_out,
                    gifPlayback: (cmd == "togif")
                }, { quoted: msg });
            } catch (error) {
                await sock.sendMessage(from, {
                    react: {
                        text: "❌",
                        key: msg.key
                    }
                });
            }
        }
    } else {
        if (cmd == "togif" || cmd == "tovid") {
            await sock.sendMessage(from, {
                react: {
                    text: "❌",
                    key: msg.key
                }
            });
            return await sock.sendMessage(from, {
                text: `❌ ${util.format(getString("sticker_convert/not_animated"), ctx.prefix, "toimg")}`
            }, {
                quoted: msg
            });
        } else {
            await sock.sendMessage(from, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

            await sock.sendMessage(from, {
                image: stream
            }, { quoted: msg });
        }
    }
}

async function run(ctx) {
    const {
        sock,
        from,
        msg,
        getString,
    } = ctx;

    const messageType = Object.keys(msg.message)[0];
    const contextInfo = msg.message[messageType]?.contextInfo;

    if (contextInfo && contextInfo.quotedMessage) {
        const isQuotedSticker = !!contextInfo.quotedMessage.stickerMessage;

        if (isQuotedSticker) {
            await downloadandSendSticker(contextInfo.quotedMessage, ctx);
        }
    } else {
        await sock.sendMessage(from, {
            react: {
                text: "❌",
                key: msg.key
            }
        });

        let output_string = "";

        if (ctx.cmd == "togif") {
            output_string = getString("sticker_convert/a_gif")
        } else if (ctx.cmd == "tovid") {
            output_string = getString("sticker_convert/a_video")
        } else {
            output_string = getString("sticker_convert/an_image")
        }

        await sock.sendMessage(from, {
            text: `❌ ${util.format(
                getString("sticker_convert/error_no_input"),
                ctx.prefix,
                ctx.cmd,
                output_string
            )}`
        }, {
            quoted: msg
        });
    }
}

module.exports = {
    run
};