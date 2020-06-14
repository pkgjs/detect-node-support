'use strict';

const Debug = require('debug');
const Yaml = require('js-yaml');

const Loader = require('../loader');
const Utils = require('../utils');

const TravisMerge = require('./merge');


const internals = {
    validMergeModes: new Set(['deep_merge_append', 'deep_merge_prepend', 'deep_merge', 'merge'])
};


internals.log = Debug('detect-node-support');


internals.normalizeImports = (travisYaml, { relativeTo }) => {

    return Utils.toArray(travisYaml.import)
        .map((entry) => {

            if (typeof entry === 'string') {
                entry = { source: entry };
            }

            const original = entry.source;

            if (entry.source.startsWith('./')) {
                entry.source = entry.source.substring(2);

                if (relativeTo) {
                    const relativeParts = relativeTo.source.split('/');
                    relativeParts.pop();
                    relativeParts.push(entry.source);
                    entry.source = relativeParts.join('/');
                }
            }

            if (!entry.mode) {
                entry.mode = 'deep_merge_append';
            }

            if (!internals.validMergeModes.has(entry.mode)) {
                throw new Error(`Invalid merge mode for ${original} in ${relativeTo ? relativeTo.source : '.travis.yml'}: ${entry.mode}`);
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


exports.apply = async (yaml, { loadFile, relativeTo, cache = new Map() }) => {

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

        await exports.apply(imported, { loadFile, relativeTo: entry, cache });

        delete imported.import;

        TravisMerge[entry.mode](yaml, imported);
    }
};
