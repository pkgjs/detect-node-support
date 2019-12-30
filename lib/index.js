'use strict';

const Fs = require('fs');
const Path = require('path');
const Yaml = require('js-yaml');


module.exports.detect = ({ path }) => {

    const packageJson = require(Path.join(path, 'package.json'));

    const { name, version } = packageJson;

    const travisYaml = Yaml.safeLoad(Fs.readFileSync(Path.join(path, '.travis.yml')), { schema: Yaml.FAILSAFE_SCHEMA });

    return {
        name,
        version,
        travis: {
            raw: travisYaml.node_js
        }
    };
};
