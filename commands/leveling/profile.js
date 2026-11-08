const { decorate } = require("../../helpers/decorator.js");
const { getProp } = require("../../helpers/prop_mgr.js")
const { parsePhoneNumberWithError } = require("libphonenumber-js")

async function getUserProfilePicture(sock, jid) {
    try {
        const imageUrl = await sock.profilePictureUrl(jid, 'image');
        return imageUrl;
    } catch (error) {
        return null;
    }
}

async function run(ctx) {
    const { sock, from, msg, participants, senderNumber, db, getString } = ctx

    const profileStmt = db.prepare('SELECT username, user_number, xp, messages, commands FROM profiles WHERE chat_id = ? AND user_number = ?');
    const profileData = profileStmt.get(from, senderNumber);

    const pfp = await getUserProfilePicture(sock, senderNumber + "@s.whatsapp.net")
    const pfp_response = await fetch((pfp) ? pfp : await getProp("quote_profile_picture_fallback", false, from));
    const pfp_arrayBuffer = Buffer.from(await pfp_response.arrayBuffer());

    let profile_information = []

    profile_information.push(
        {
            text: `${getString("profile/name")}`,
            list_item_type: "simple_item"
        },
        {
            text: `${profileData.username}`,
            list_item_type: "simple_arrow",
        },
        {
            text: `${getString("profile/number")}`,
            list_item_type: "simple_item"
        },
        {
            text: `${parsePhoneNumberWithError("+" + profileData.user_number).formatInternational()}`,
            list_item_type: "simple_arrow",
            padding_end: 1
        },
        {
            text: `${(await getProp("leveling", false, from)) ? getString("profile/xp") : getString("profile/messages")}`,
            list_item_type: "simple_item"
        },
    )

    if (await getProp("leveling", false, from)) {
        const goal = await getProp("level_points_goal", false, from);
        const currentLevel = Math.floor(profileData.xp / goal);
        const currentXpInLevel = profileData.xp % goal;
        const progressPercent = (currentXpInLevel / goal) * 100;
        const formattedPercent = progressPercent % 1 === 0 ? `${progressPercent.toFixed(0)}%` : `${progressPercent.toFixed(1)}%`;

        const totalBlocks = 10;
        let progressBar = '';
        for (let i = 0; i < totalBlocks; i++) {
            const blockStart = (i / totalBlocks) * 100;
            const blockEnd = ((i + 1) / totalBlocks) * 100;
            if (progressPercent >= blockEnd) {
                progressBar += '█';
            } else if (progressPercent <= blockStart) {
                progressBar += '░';
            } else {
                const blockProgress = (progressPercent - blockStart) / (blockEnd - blockStart);
                if (blockProgress <= 0.33) {
                    progressBar += '▒';
                } else if (blockProgress <= 0.66) {
                    progressBar += '▓';
                } else {
                    progressBar += '█';
                }
            }
        }

        profile_information.push(
            {
                text: `${profileData.xp}`,
                list_item_type: "simple_arrow",
            },
            {
                text: `${getString("profile/level")}`,
                list_item_type: "simple_item"
            },
            {
                text: `${currentLevel}`,
                list_item_type: "simple_arrow",
            },
            {
                text: `${getString("profile/level_progress")} (${formattedPercent})`,
                list_item_type: "simple_item"
            },
            {
                text: `${currentLevel} › ${progressBar} › ${currentLevel + 1}`,
                list_item_type: "simple_arrow",
                padding_end: 1
            },
        )
    } else {
        profile_information.push(
            {
                text: `${profileData.messages}`,
                list_item_type: "simple_arrow",
                padding_end: 1
            }
        )
    }

    profile_information.push(
        {
            text: `${getString("profile/commands")}`,
            list_item_type: "simple_item"
        },
        {
            text: `${profileData.commands}`,
            list_item_type: "simple_arrow",
        }
    )

    const body_text = await decorate({
        emoji: "👤",
        no_start_padding: true,
        title: getString("profile/profile").toLowerCase(),
        content: [
            {
                type: "see_more"
            },
            {
                type: "list_complex",
                padding: 1,
                items: profile_information
            }
        ]
    })

    await sock.sendMessage(from, { image: pfp_arrayBuffer, caption: body_text }, { quoted: msg })

}

module.exports = { run }