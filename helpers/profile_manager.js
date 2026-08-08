const { mkdir, writeFile, readdir } = require('node:fs/promises');
const path = require('node:path');

async function saveProfiles(profiles) {
    for (const [gid, data] of Object.entries(profiles)) {
        const dirPath = path.resolve("./database/" + gid);
        const filePath = path.join(dirPath, "profiles.json");

        await mkdir(dirPath, { recursive: true });

        await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
}

async function loadProfiles() {
    const dbPath = path.resolve("./database");
    const result = {};

    const fallbacks = {
        messages: 0,
        username: "Unknown"
    };

    try {
        const folders = await readdir(dbPath);

        const groupFolders = folders.filter(folder => folder.endsWith('@g.us'));

        for (const gid of groupFolders) {
            const filePath = path.join(dbPath, gid, "profiles.json");

            try {
                const fileContent = await readFile(filePath, 'utf-8');
                const data = JSON.parse(fileContent);

                if (!data.pn) {
                    result[gid] = data;
                    continue;
                }

                result[gid] = {
                    pn: {
                        messages: data.pn.messages ?? fallbacks.messages,
                        username: data.pn.username ?? fallbacks.username
                    }
                };

            } catch (err) {
                result[gid] = {};
            }
        }
    } catch (err) {
        console.error("Error reading database:", err);
    }

    return result;
}


module.exports = {
    saveProfiles,
    loadProfiles
}