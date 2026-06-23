async function run(ctx) {
    const { sock, from, msg } = ctx;

    await sock.sendMessage(
        from,
        { text: "Pong! Command has been received." },
        { quoted: msg }
    );

    console.log(ctx.blossom.cmd);
}

module.exports = { run };