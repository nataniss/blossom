const { createCanvas, loadImage, registerFont } = require('canvas')
const { profiles } = require('../../index')
const sharp = require('sharp');
const {
    getProp
} = require("../../helpers/prop_mgr.js");

// fork of: https://gitlab.com/davideblasutto/canvas-multiline-text/-/blob/master/index.js?ref_type=heads
function drawMultilineText(ctx, text, opts) {

    if (!opts)
        opts = {};

    const font = opts.font || 'sans-serif';
    const lineHeightMultiplier = opts.lineHeight || 1.1;
    const minFontSize = opts.minFontSize || 30;
    const maxFontSize = opts.maxFontSize || 100;

    const rect = opts.rect || {
        x: 0,
        y: 0,
        width: ctx.canvas.width,
        height: ctx.canvas.height
    };

    const words = text.split(/\s+/);

    let lines = [];
    let fontSize;

    for (
        fontSize = minFontSize;
        fontSize <= maxFontSize;
        fontSize++
    ) {

        const lineHeight = fontSize * lineHeightMultiplier;

        ctx.font = fontSize + 'px ' + font;

        lines = [];

        let line = '';

        for (let i = 0; i < words.length; i++) {

            const word = words[i];

            const candidate =
                line.length > 0
                    ? line + ' ' + word
                    : word;

            if (ctx.measureText(candidate).width > rect.width) {

                if (line.length > 0) {
                    lines.push(line);
                }

                line = word;

            } else {
                line = candidate;
            }
        }

        if (line.length > 0) {
            lines.push(line);
        }

        const totalHeight =
            fontSize +
            (lines.length - 1) * lineHeight;

        if (totalHeight > rect.height) {
            break;
        }
    }

    const lineHeight = fontSize * lineHeightMultiplier;

    const totalHeight =
        fontSize +
        (lines.length - 1) * lineHeight;

    const startY =
        rect.y +
        (rect.height - totalHeight) / 2 +
        fontSize;

    for (let i = 0; i < lines.length; i++) {

        const y =
            startY +
            i * lineHeight;

        if (opts.stroke) {
            ctx.strokeText(
                lines[i],
                rect.x,
                y
            );
        } else {
            ctx.fillText(
                lines[i],
                rect.x,
                y
            );
        }
    }

    return {
        fontSize: fontSize,
        lineCount: lines.length,
        lines: lines,
        lineHeight: lineHeight,
        totalHeight: totalHeight,
        startY: startY
    };
}

async function getUserProfilePicture(sock, jid) {
    try {
        const imageUrl = await sock.profilePictureUrl(jid, 'image');
        return imageUrl;
    } catch (error) {
        return null;
    }
}

async function makeQuoteImageBuffer(info) {
    const {
        username,
        pfp,
        canvas,
        canvas_ctx,
        quotedText,
        from
    } = info;

    canvas_ctx.fillStyle = "black";
    canvas_ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pfp_response = await fetch((pfp) ? pfp : await getProp("quote_profile_picture_fallback", false, from));
    const pfp_arrayBuffer = Buffer.from(await pfp_response.arrayBuffer());

    let pfp_to_draw;
    if (!await getProp("colored_quote_profile_picture", false, from)) {
        const greyscale_pfp_arrayBuffer = await sharp(pfp_arrayBuffer).grayscale().toBuffer();
        pfp_to_draw = await loadImage(greyscale_pfp_arrayBuffer);
    } else {
        pfp_to_draw = await loadImage(pfp_arrayBuffer);
    }

    canvas_ctx.drawImage(pfp_to_draw, 0, 0, canvas.height, canvas.height);

    const fade_size = canvas.height / 2

    const gradient = canvas_ctx.createLinearGradient(canvas.height - fade_size, 0, canvas.height, 0);

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');

    canvas_ctx.fillStyle = gradient;
    canvas_ctx.fillRect(0, 0, canvas.height, canvas.height);

    canvas_ctx.fillStyle = '#ffffff';

    canvas_ctx.textAlign = 'center';
    canvas_ctx.textBaseline = 'alphabetic';

    const available_width = canvas.width - canvas.height;
    const text_x = canvas.height + (available_width / 2);

    const text_area = {
        x: text_x,
        y: 0,
        width: available_width - 48,
        height: canvas.height
    };

    const result = drawMultilineText(canvas_ctx, quotedText, {
        rect: text_area,
        font: 'sans-serif',
        lineHeight: 1.2,
        minFontSize: 40,
        maxFontSize: 40
    });

    const lastQuoteLineY =
        result.startY +
        (result.lineCount - 1) * result.lineHeight;

    canvas_ctx.font = '24px sans-serif';
    canvas_ctx.textAlign = 'center';
    canvas_ctx.textBaseline = 'top';

    canvas_ctx.fillText(
        `- ${username}`,
        text_x,
        lastQuoteLineY + 10
    );

    return canvas.toBuffer('image/png')
}

async function run(ctx) {

    const { sock, msg, participants, from, getString } = ctx

    const canvas = createCanvas(1024, 384)
    const canvas_ctx = canvas.getContext('2d')

    const messageContent = msg.message;

    if (messageContent) {
        const msgType = Object.keys(messageContent)[0];
        const contextInfo = messageContent[msgType]?.contextInfo;

        if (contextInfo && contextInfo.quotedMessage) {
            const quotedMsg = contextInfo.quotedMessage;

            let quotedText = quotedMsg.conversation ||
                quotedMsg.extendedTextMessage?.text ||
                quotedMsg.imageMessage?.caption ||
                quotedMsg.videoMessage?.caption ||
                "";

            const quotedPersonJid = contextInfo.participant
            const quotedPerson = participants.find(user => user.id === quotedPersonJid)
            const quotedPersonPN = quotedPerson.phoneNumber.replace('@s.whatsapp.net', '')

            const username = profiles[from][quotedPersonPN].username
            const pfp = await getUserProfilePicture(sock, quotedPerson.phoneNumber)

            if (quotedText == "") {
                await sock.sendMessage(from, {
                    react: {
                        text: "❌",
                        key: msg.key
                    }
                });
                return await sock.sendMessage(from, { text: `❌ ${getString("quote/no_text")}`}, { quoted: msg }) 
            }

            if (!pfp) {
                await sock.sendMessage(from, { text: `⚠️ ${getString("quote/no_pfp")}`}, { quoted: msg })
            }

            await sock.sendMessage(from, {
                react: {
                    text: "⏳",
                    key: msg.key
                }
            });

            const quote_buffer = await makeQuoteImageBuffer({
                username,
                pfp,
                canvas,
                canvas_ctx,
                quotedText,
                from
            })

            await sock.sendMessage(from, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            });

            await sock.sendMessage(from, { image: quote_buffer }, { quoted: msg })
        } else {
                await sock.sendMessage(from, {
                    react: {
                        text: "❌",
                        key: msg.key
                    }
                });

            return await sock.sendMessage(from, { text: `❌ ${getString("quote/no_message_reply")}`}, { quoted: msg })
        }
    }

}

module.exports = { run }