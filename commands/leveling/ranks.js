const { getProp } = require("../../helpers/prop_mgr.js")
const { decorate } = require("../../helpers/decorator.js")

function getOrdinalString(index, getString) {
    const remainder100 = index % 100;
    if (remainder100 >= 11 && remainder100 <= 13) {
        return `${index}${getString("other")}`;
    }

    const remainder10 = index % 10;
    const suffixes = {
        1: getString("first"),
        2: getString("second"),
        3: getString("third")
    };

    return `${index}${suffixes[remainder10] || getString("other")}`;
}


async function run(ctx) {
    const { sock, from, msg, db, getString } = ctx

    if (!await getProp("leveling", false, from)) {
        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "📊",
                title: getString("rank/rank").toLowerCase(),
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: [
                            {
                                text: `${getString("rank/leveling_off")}`,
                                list_item_type: "simple_item"
                            }
                        ]
                    }
                ]
            })
        }, { quoted: msg })
    }

    const rankStmt = db.prepare(`
        SELECT * FROM profiles
        WHERE chat_id = ? 
        ORDER BY xp DESC
    `)

    let rankResults = rankStmt.all(from)

    const maxEntries = await getProp("max_rank_entries", false, from)

    if (typeof maxEntries === "number" && maxEntries > 0) {
        rankResults = rankResults.slice(0, maxEntries)
    }

    let rankBody = []

    const goal = await getProp("level_points_goal", false, from);

    let index = 0

    for (const entry of rankResults) {
        if (entry.xp === 0) continue

        index = index + 1
        
        rankBody.push(
            {
                text: `*${getOrdinalString(index, getString)} ${getString("rank/place")}: ${entry.username}*`,
                list_item_type: "simple_item"
            },
            {
                text: `*${getString("rank/xp")}:* ${entry.xp}`,
                list_item_type: "simple_arrow",
            },
            {
                text: `*${getString("rank/level")}:* ${Math.floor(entry.xp / goal)}`,
                list_item_type: "simple_arrow",
                padding_end: 1
            },
        )
    }

    await sock.sendMessage(from, {
        text: await decorate(
            {
                emoji: "📊",
                no_start_padding: true,
                title: getString("rank/rank").toLowerCase(),
                content: [
                    {
                        type: "see_more"
                    },
                    {
                        type: "list_complex",
                        padding_start: 1,
                        items: rankBody
                    }
                ]
            }
        )
    }, { quoted: msg })
}

module.exports = { run }