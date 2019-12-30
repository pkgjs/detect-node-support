'use strict';

const Fs = require('fs');
const Path = require('path');
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

    if (!raw.size) {
        raw.add('latest');
    }

    return { raw: [...raw] };
};


exports.detect = ({ path }) => {

    const travisYamlPath = Path.join(path, '.travis.yml');

    if (!Fs.existsSync(travisYamlPath)) {
        return;
    }

    const travisYaml = Yaml.safeLoad(Fs.readFileSync(travisYamlPath), { schema: Yaml.FAILSAFE_SCHEMA });

    return internals.scan(travisYaml);
};
