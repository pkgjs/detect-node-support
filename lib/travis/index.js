'use strict';

const Nv = require('@pkgjs/nv');
const Yaml = require('js-yaml');


const internals = {};

internals.nodeAliases = {
    latest: 'active',
    node: 'active',
    stable: 'active'
};


internals.toArray = (v) => {

    if (v === undefined) {
        return [];
    }

    return Array.isArray(v) ? v : [v];
};


internals.normalizeImports = (travisYaml, { relativeTo }) => {

    return internals.toArray(travisYaml.import).map((entry) => {

        if (typeof entry === 'string') {
            entry = { source: entry };
        }

        if (entry.source.startsWith('./')) {
            entry.source = entry.source.substring(2);

            if (relativeTo) {
                const relativeParts = relativeTo.source.split('/');
                relativeParts.pop();
                relativeParts.push(entry.source);
                entry.source = relativeParts.join('/');
            }
        }

        return entry;
    });
};


internals.applyImports = async (yaml, { loadFile, relativeTo }) => {

    if (!yaml.import) {
        return;
    }

    const imports = internals.normalizeImports(yaml, { relativeTo });

    for (const entry of imports) {

        const buffer = await loadFile(entry.source);

        const imported = Yaml.safeLoad(buffer, {
            schema: Yaml.FAILSAFE_SCHEMA,
            json: true
        });

        await internals.applyImports(imported, { loadFile, relativeTo: entry });

        for (const key in imported) {

            if (key === 'import') {
                continue;
            }

            yaml[key] = imported[key];
        }
    }
};


internals.scan = async (travisYaml, options) => {

    await internals.applyImports(travisYaml, options);

    const rawSet = new Set();

    for (const v of internals.toArray(travisYaml.node_js)) {
        rawSet.add(v);
    }

    if (travisYaml.env) {

        for (const env of internals.toArray(travisYaml.env.matrix)) {

            const matches = env.match(/(?:NODEJS_VER|TRAVIS_NODE_VERSION|NODE_VER)="?(node\/)?(?<version>[\w./*]+)"?/);

            if (matches) {
                rawSet.add(matches.groups.version);
            }
        }
    }

    if (travisYaml.matrix) {

        for (const include of internals.toArray(travisYaml.matrix.include)) {

            if (include.node_js) {
                rawSet.add(include.node_js);
            }
        }
    }

    if (travisYaml.language === 'node_js' && !rawSet.size) {
        rawSet.add('latest');
    }

    const raw = [...rawSet];
    const resolved = {};

    for (const version of raw) {

        const nv = await Nv(internals.nodeAliases[version] || version);

        if (!nv.length) {
            resolved[version] = false;
        }
        else {
            resolved[version] = nv[nv.length - 1].version;
        }
    }

    return { raw, resolved };
};


exports.detect = async ({ loadFile }) => {

    try {
        var buffer = await loadFile('.travis.yml');
    }
    catch (err) {

        if (err.code === 'ENOENT') {
            return;
        }

        throw err;
    }

    const travisYaml = Yaml.safeLoad(buffer, {
        schema: Yaml.FAILSAFE_SCHEMA,
        json: true
    });

    return {
        travis: await internals.scan(travisYaml, { loadFile })
    };
};
