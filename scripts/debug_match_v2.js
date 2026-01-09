
const tableAttrs = { subtype: "polycarbonate", snow_zone: "2" };
const contextAttrs = {
    snow_zone: "2",
    roof_type: "polycarbonate",
    subtype: "standard" // This is what Configurator sends by default
};

function check(t, c) {
    const keys = Object.keys(t);
    for (const key of keys) {
        if (!c[key]) {
            console.log(`Missing key in context: ${key}`);
            return false;
        }
        if (String(t[key]) !== String(c[key])) {
            console.log(`Mismatch ${key}: Table="${t[key]}" vs Context="${c[key]}"`);
            return false;
        }
    }
    return true;
}

console.log("Strict Match Result:", check(tableAttrs, contextAttrs));

function smartCheck(t, c) {
    const keys = Object.keys(t);
    for (const key of keys) {
        const tVal = String(t[key]).toLowerCase();

        // Special Handling for Subtype/RoofType aliasing
        if (key === 'subtype') {
            const cSub = c['subtype'] ? String(c['subtype']).toLowerCase() : '';
            const cRoof = c['roof_type'] ? String(c['roof_type']).toLowerCase() : '';

            // 1. Exact Match on Subtype
            if (cSub === tVal) continue;

            // 2. Fallback Match on RoofType (Table says "polycarbonate", Context Roof matches)
            if (cRoof === tVal) continue;

            // 3. Partial/Fuzzy (e.g. "poly" in "polycarbonate")
            if (tVal.includes(cSub) || cSub.includes(tVal)) continue;

            console.log(`Subtype Mismatch: Table="${tVal}" vs C.Sub="${cSub}"/C.Roof="${cRoof}"`);
            return false;
        }

        if (!c[key]) return false;
        if (String(c[key]) !== String(t[key])) return false;
    }
    return true;
}

console.log("Smart Match Result:", smartCheck(tableAttrs, contextAttrs));
