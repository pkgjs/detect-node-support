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


internals.scan = async (travisYaml) => {

    const rawSet = new Set();

    for (const v of internals.toArray(travisYaml.node_js)) {
        rawSet.add(v);
    }

    if (travisYaml.env) {

        for (const env of internals.toArray(travisYaml.env.matrix)) {

            const matches = env.match(/(?:NODEJS_VER|TRAVIS_NODE_VERSION|NODE_VER)="?(node\/)?(?<version>[\w./*]+)"?/); /* hack syntax highlighter 🤦‍♂️ */

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

    const buffer = await loadFile('.travis.yml');

    if (buffer === undefined) {
        return;
    }

    const travisYaml = Yaml.safeLoad(buffer, { schema: Yaml.FAILSAFE_SCHEMA });

    return {
        travis: await internals.scan(travisYaml)
    };
};
