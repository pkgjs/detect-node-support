'use strict';

const Debug = require('debug');
const Nv = require('@pkgjs/nv');
const Yaml = require('js-yaml');

const Loader = require('./loader');


const internals = {};


internals.log = Debug('detect-node-support');


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

    return internals.toArray(travisYaml.import)
        .map((entry) => {

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
        })
        .filter((entry) => !entry.if); // @todo: log a warning
};


internals.loadSource = async (source, { loadFile, cache }) => {

    if (cache[source]) {
        internals.log('Returning cached %s', source);
        return cache[source];
    }

    let path = source;

    if (source.includes(':')) {
        const [repository, fileName] = source.split(':');
        const loader = await Loader.create({ repository: `https://github.com/${repository}` });

        path = fileName;
        loadFile = loader.loadFile;
    }

    internals.log('Loading %s', source);
    const result = await loadFile(path);
    cache[source] = result;
    return result;
};


internals.applyImports = async (yaml, { loadFile, relativeTo, cache = new Map() }) => {

    if (!yaml.import) {
        return;
    }

    const imports = internals.normalizeImports(yaml, { relativeTo });

    for (const entry of imports) {

        const buffer = await internals.loadSource(entry.source, { loadFile, cache });

        const imported = Yaml.safeLoad(buffer, {
            schema: Yaml.FAILSAFE_SCHEMA,
            json: true
        });

        await internals.applyImports(imported, { loadFile, relativeTo: entry, cache });

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
