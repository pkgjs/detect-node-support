'use strict';

const Fs = require('fs');
const Path = require('path');
const Yaml = require('js-yaml');


const internals = {};

internals.detectFromTravisYaml = (travisYaml) => {

    const raw = new Set();

    if (travisYaml.node_js) {
        const versions = Array.isArray(travisYaml.node_js) ? travisYaml.node_js : [travisYaml.node_js];

        versions.forEach((v) => raw.add(v));
    }

    if (travisYaml.env) {

        for (const env of travisYaml.env.matrix) {

            const matches = env.match(/(?:NODEJS_VER|TRAVIS_NODE_VERSION|NODE_VER)="?(node\/)?(?<version>[\w./*]+)"?/); /* hack syntax highlighter 🤦‍♂️ */

            raw.add(matches.groups.version);
        }
    }

    return { raw: [...raw] };
};


module.exports.detect = ({ path }) => {

    const packageJson = require(Path.join(path, 'package.json'));

    const { name, version } = packageJson;

    const travisYaml = Yaml.safeLoad(Fs.readFileSync(Path.join(path, '.travis.yml')), { schema: Yaml.FAILSAFE_SCHEMA });

    return {
        name,
        version,
        travis: internals.detectFromTravisYaml(travisYaml)
    };
};
