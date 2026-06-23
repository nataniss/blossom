async function run(sock, from, msg) {
    sock.sendMessage(from, { text: "Pong! Command has been recieved."}, { quoted: msg })
}

module.exports = {
    run
}