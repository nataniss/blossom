const { decorate } = require("../../helpers/decorator.js")

async function run(ctx) {
    const { sock, from, msg } = ctx;

    const date_after = Date.now()

    const latency = (Date.now() - msg.messageTimestamp * 1000) / 1000;
 
    const ping_message = await sock.sendMessage(
        from,
        { text: await decorate(
            {
                emoji: "🏓",
                title: "ping",
                content: [
                    {
                        type: "list",
                        padding: 1,
                        items: [
                            `Latency: ${(latency).toFixed(2)}s`,
                            `Calculating sending speed...`
                        ]
                    }
                ]
            }
        ) },
        { quoted: msg }
    );

    const date_before = Date.now()

    await sock.sendMessage(
        from,
        { text: await decorate(
            {
                emoji: "🏓",
                title: "ping",
                content: [
                    {
                        type: "list",
                        padding: 1,
                        items: [
                            `Latency: ${latency.toFixed(2)}s`,
                            `Sending speed: ${((date_before - date_after) / 1000).toFixed(2)}s`
                        ]
                    }
                ]
            }
        ), edit: ping_message.key },
    );
}

module.exports = { run };