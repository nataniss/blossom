const fs = require('node:fs');
const fsp = require('node:fs/promises');

async function decorate(info) {

    if (!info)
        throw new Error("You must supply info to the decorator");

    let decoration_style;

    if (fs.existsSync("./helpers/decorator_current_style/current.json")) {
        decoration_style = JSON.parse(
            fs.readFileSync("./helpers/decorator_current_style/current.json")
        );
    } else {
        decoration_style = JSON.parse(
            fs.readFileSync("./helpers/presets/blossom_default/styles.json")
        );

        fs.writeFileSync(
            "./helpers/decorator_current_style/current.json",
            JSON.stringify(decoration_style)
        );
    }

    const style = decoration_style.styles;

    let lines = [];

    lines.push(
        style.title
            .replaceAll("[emoji]", info.emoji ?? "❓")
            .replaceAll("[title]", info.title ?? "Title")
    );

    lines.push("");

    for (const body of info.content ?? []) {

        switch (body.type) {

            case "list":
            case "list_text":
            case "list_complex":
                lines.push(...renderBody(style, body));
                break;

            case "text":
                lines.push(...renderText(style, body));
                break;

            case "raw":
                lines.push(...renderRaw(body));
                break;

            case "see_more":
                lines.push("​".repeat(1024))
                break;

            default:
                throw new Error(`Unknown body type "${body.type}"`);
        }
    }
    

if (style.footer) {
    lines.push("");
    lines.push(style.footer);
}

return lines.join("\n");
}

function renderBodyItem(style, item, bodyType) {

    if (typeof item === "string") {
        return style.body_text.replaceAll("[text]", item);
    }

    switch (item.list_item_type) {

        case "emoji_item":
            return style.body_text_complex
                .replaceAll("[emoji]", item.emoji)
                .replaceAll("[text]", item.text);

        case "emoji_arrow":
            return style.body_text_arrow_complex
                .replaceAll("[emoji]", item.emoji)
                .replaceAll("[text]", item.text);

        case "simple_arrow":
            return style.body_text_arrow
                .replaceAll("[text]", item.text);

        case "simple_item":
        default:
            return style.body_text
                .replaceAll("[text]", item.text);
    }
}

function pad(lines, before = 0, after = 0) {
    return [
        ...Array(before).fill(""),
        ...lines,
        ...Array(after).fill("")
    ];
}

function getPadding(obj) {
    return {
        start: obj.padding_start ?? obj.padding ?? 0,
        end: obj.padding_end ?? obj.padding ?? 0
    };
}

function renderBody(style, body) {

    const out = [];

    const paddingOuter = body.padding_outer ?? 0;

    for (let i = 0; i < paddingOuter; i++)
        out.push("");

    if (body.title) {
        out.push(
            style.body_title.replaceAll("[text]", body.title)
        );
    } else {
        out.push(style.body_start);
    }

    const { start, end } = getPadding(body);

    for (let i = 0; i < start; i++)
        out.push(style.body_empty);

    for (const item of body.items ?? []) {
        out.push(
            renderBodyItem(style, item, body.type)
        );
    }

    for (let i = 0; i < end; i++)
        out.push(style.body_empty);

    out.push(style.body_end);

    for (let i = 0; i < paddingOuter; i++)
        out.push("");

    return out;
}

function renderText(style, body) {

    const { start, end } = getPadding(body);

    const out = [];

    for (let i = 0; i < start; i++)
        out.push("");

    for (const item of body.items ?? []) {
        out.push(
            style.text.replaceAll("[text]", item)
        );
    }

    for (let i = 0; i < end; i++)
        out.push("");

    return out;
}

function renderRaw(body) {

    const { start, end } = getPadding(body);
    const outer = body.padding_outer ?? 0;

    return [
        ...Array(outer).fill(""),
        ...Array(start).fill(""),
        ...(body.items ?? []),
        ...Array(end).fill(""),
        ...Array(outer).fill("")
    ];
}

module.exports = { decorate }