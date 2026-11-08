const { decorate } = require("./decorator.js");
const { getProp } = require("./prop_mgr.js");
const util = require('util');

async function run(ctx) {
    const { sock, from, msg, getString, text, senderNumber, prefix, getBotAdminStatus, getAdminStatus, participants, db } = ctx;

    const hasAll = msg?.message?.extendedTextMessage?.text?.includes("@all") ?? false;
    const canUse = !await getProp("can_members_use_@all", false, from);

    if (hasAll && canUse) {
        if (getBotAdminStatus(sock, participants) !== null && getAdminStatus(senderNumber, participants) === null) {
            await sock.sendMessage(from, { text: `🚫 ${getString("on_message/cant_@all")}` }, { quoted: msg });
            await sock.sendMessage(from, { delete: msg.key });
        }
    }

    try {
        if (text.toLowerCase() === getString("prefix_message").toLowerCase()) {
            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎭",
                    title: getString("prefix_message").toLowerCase(),
                    content: [{ type: "text", items: [util.format(getString("prefix/its"), ctx.prefix)] }]
                })
            }, { quoted: msg });
        }
    } catch (e) {
        console.error(e);
    }

    const selectStmt = db.prepare('SELECT * FROM profiles WHERE chat_id = ? AND user_number = ?');
    const insertStmt = db.prepare('INSERT INTO profiles (chat_id, user_number, messages, username, xp, commands) VALUES (?, ?, 0, ?, 0, 0)');

    let profile = selectStmt.get(from, senderNumber);

    if (!profile) {
        insertStmt.run(from, senderNumber, msg.pushName || '');
        profile = selectStmt.get(from, senderNumber);
    }

    const isCommand = text.trim().startsWith(prefix);
    const levelingEnabled = await getProp("leveling", false, from);
    const previous_xp = profile.xp;
    const xpGain = levelingEnabled ? 1 : 0;
    const cmdIncrement = isCommand ? 1 : 0;

    const updateStmt = db.prepare(`
        UPDATE profiles 
        SET messages = messages + 1,
            commands = commands + ?,
            xp = xp + ?,
            username = COALESCE(?, username)
        WHERE chat_id = ? AND user_number = ?
    `);
    updateStmt.run(cmdIncrement, xpGain, msg.pushName || null, from, senderNumber);

    const updatedProfile = selectStmt.get(from, senderNumber);
    const current_xp = updatedProfile.xp;

    if (levelingEnabled) {
        let points_goal = await getProp("level_points_goal", false, from);

        if (points_goal && points_goal > 0) {
            if (await getProp("level_up_message", false, from) && Math.floor(previous_xp / points_goal) !== Math.floor(current_xp / points_goal)) {
                await sock.sendMessage(from, {
                    text: await decorate({
                        no_start_padding: true,
                        emoji: "🌟",
                        title: getString("level_up/level_up").toLowerCase(),
                        content: [
                            {
                                type: "see_more"
                            },
                            {
                                type: "text",
                                padding_end: 1,
                                items: [util.format(getString("level_up/message"), `@${senderNumber}`)]
                            },
                            {
                                type: "list_complex",
                                padding: 1,
                                items: [
                                    {
                                        emoji: "🏆",
                                        text: `*${getString("level_up/level")}:* ${util.format(
                                            getString("level_up/upgrade_format"),
                                            Math.floor(previous_xp / points_goal),
                                            Math.floor(current_xp / points_goal)
                                        )}`,
                                        list_item_type: "emoji_item"
                                    },
                                    {
                                        emoji: "⭐",
                                        text: `*${getString("level_up/xp")}:* ${util.format(
                                            getString("level_up/upgrade_format"),
                                            previous_xp,
                                            current_xp
                                        )}`,
                                        list_item_type: "emoji_item"
                                    }
                                ]
                            },
                            {
                                type: "text",
                                padding_start: 1,
                                items: [
                                    getString("level_up/footer"),
                                    util.format(getString("level_up/footer_2"), `${prefix}profile`)
                                ]
                            }
                        ]
                    }),
                    mentions: [`${senderNumber}@s.whatsapp.net`]
                }, { quoted: msg });
            }
        }
    }
}

module.exports = { run };