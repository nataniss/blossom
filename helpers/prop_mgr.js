const { mkdir, writeFile, access, readFile } = require("node:fs/promises");
const { constants } = require("node:fs");
const path = require("node:path");

const DATABASE_PATH = path.resolve("./database");
const FALLBACK_PATH = path.resolve("./helpers/fallback_props.json");

function getPropsPath(global, from) {
    return global
        ? path.join(DATABASE_PATH, "props.json")
        : path.join(DATABASE_PATH, from, "props.json");
}

async function loadJson(file) {
    return JSON.parse(await readFile(file, "utf-8"));
}

async function makePropDefsIfNonExistent(global, from) {
    const propsPath = getPropsPath(global, from);

    await mkdir(path.dirname(propsPath), {
        recursive: true
    });

    try {
        await access(propsPath, constants.F_OK);
    } catch {
        await writeFile(propsPath, JSON.stringify({}, null, 4), "utf-8");
    }
}

async function getProp(propAsked, global = false, from = "") {
    await makePropDefsIfNonExistent(global, from);

    const propsPath = getPropsPath(global, from);

    let data;
    let fallback;

    try {
        data = await loadJson(propsPath);
        fallback = await loadJson(FALLBACK_PATH);
    } catch (err) {
        throw new Error("Failed to load prop definitions.");
    }

    if (Object.hasOwn(data, propAsked)) {
        return data[propAsked];
    }

    if (Object.hasOwn(fallback, propAsked)) {
        return fallback[propAsked].fallback;
    }

    throw new Error(`Property "${propAsked}" does not exist.`);
}

async function setProp(prop, value, global = false, from = "") {
    await makePropDefsIfNonExistent(global, from);

    const propsPath = getPropsPath(global, from);

    let data;
    let fallback;

    try {
        data = await loadJson(propsPath);
        fallback = await loadJson(FALLBACK_PATH);
    } catch {
        throw new Error("Failed to load prop definitions.");
    }

    if (!Object.hasOwn(fallback, prop)) {
        throw new Error(`Property "${prop}" does not exist.`);
    }

    const expectedType = fallback[prop].type;

    if (expectedType && typeof value !== expectedType) {
        throw new TypeError(
            `Property "${prop}" expects a ${expectedType}, got ${typeof value}.`
        );
    }

    if (Object.hasOwn(fallback[prop], "regex")) {
        const regex = new RegExp(fallback[prop].regex);

        if (!regex.test(value)) {
            throw new Error(
                `Value "${value}" does not match the regex for "${prop}".`
            );
        }
    }

    data[prop] = value;

    await writeFile(
        propsPath,
        JSON.stringify(data, null, 4),
        "utf-8"
    );
}

function checkType(value, expected) {
    switch (expected) {
        case "array":
            return Array.isArray(value);

        case "null":
            return value === null;

        case "object":
            return (
                typeof value === "object" &&
                value !== null &&
                !Array.isArray(value)
            );

        default:
            return typeof value === expected;
    }
}

module.exports = {
    getProp,
    setProp
};