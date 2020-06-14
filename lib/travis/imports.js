'use strict';

const Yaml = require('js-yaml');

const Loader = require('../loader');
const Utils = require('../utils');

const TravisMerge = require('./merge');


const internals = {
    validMergeModes: new Set(['deep_merge_append', 'deep_merge_prepend', 'deep_merge', 'merge'])
};


internals.normalizeImports = (travisYaml, { relativeTo }) => {

    const context = relativeTo ? relativeTo.source : '.travis.yml';

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
                throw new Error(`Invalid merge mode for ${original} in ${context}: ${entry.mode}`);
            }

            if (original.includes('@')) {
                throw new Error(`Importing at commitish unsupported in ${context}: ${original}`);
            }

            return entry;
        })
        .filter((entry) => !entry.if); // @todo: log a warning
};


internals.loadSource = async (source, { loadFile }) => {

    let path = source;

    if (source.includes(':')) {
        const [repository, fileName] = source.split(':');
        const loader = await Loader.create({ repository: `https://github.com/${repository}` });

        path = fileName;
        loadFile = loader.loadFile;
    }

    return loadFile(path);
};


exports.apply = async (yaml, { loadFile, relativeTo }) => {

    if (!yaml.import) {
        return;
    }

    const imports = internals.normalizeImports(yaml, { relativeTo });

    for (const entry of imports) {

        const buffer = await internals.loadSource(entry.source, { loadFile });

        const imported = Yaml.safeLoad(buffer, {
            schema: Yaml.FAILSAFE_SCHEMA,
            json: true
        });

        await exports.apply(imported, { loadFile, relativeTo: entry });

        delete imported.import;

        TravisMerge[entry.mode](yaml, imported);
    }
};
