'use strict';

const Fs = require('fs');
const GitUrlParse = require('git-url-parse');
const Path = require('path');
const Wreck = require('@hapi/wreck');
const Yaml = require('js-yaml');


const internals = {};


internals.toArray = (v) => {

    if (v === undefined) {
        return [];
    }

    return Array.isArray(v) ? v : [v];
};


internals.scan = (travisYaml) => {

    const raw = new Set();

    for (const v of internals.toArray(travisYaml.node_js)) {
        raw.add(v);
    }

    if (travisYaml.env) {

        for (const env of internals.toArray(travisYaml.env.matrix)) {

            const matches = env.match(/(?:NODEJS_VER|TRAVIS_NODE_VERSION|NODE_VER)="?(node\/)?(?<version>[\w./*]+)"?/); /* hack syntax highlighter 🤦‍♂️ */

            if (matches) {
                raw.add(matches.groups.version);
            }
        }
    }

    if (travisYaml.matrix) {

        for (const include of internals.toArray(travisYaml.matrix.include)) {

            if (include.node_js) {
                raw.add(include.node_js);
            }
        }
    }

    if (travisYaml.language === 'node_js' && !raw.size) {
        raw.add('latest');
    }

    return { raw: [...raw] };
};


exports.detect = async ({ path, repository }) => {

    let buffer;

    if (repository) {
        const parsedRepository = GitUrlParse(repository);

        const url = `https://raw.githubusercontent.com/${parsedRepository.full_name}/HEAD/.travis.yml`;

        const result = await Wreck.get(url);

        buffer = result.payload;
    }

    if (path) {

        const travisYamlPath = Path.join(path, '.travis.yml');

        if (!Fs.existsSync(travisYamlPath)) {
            return;
        }

        buffer = Fs.readFileSync(travisYamlPath);
    }

    const travisYaml = Yaml.safeLoad(buffer, { schema: Yaml.FAILSAFE_SCHEMA });

    return internals.scan(travisYaml);
};
