'use strict';

const Nv = require('@pkgjs/nv');

const TravisImports = require('./imports');
const Utils = require('../utils');


const internals = {};


internals.nodeAliases = {
    latest: 'active',
    node: 'active',
    stable: 'active'
};


internals.scan = async (travisYaml, options) => {

    await TravisImports.apply(travisYaml, options);

    const rawSet = new Set();

    for (const v of Utils.toArray(travisYaml.node_js)) {
        rawSet.add(v);
    }

    if (travisYaml.env) {

        for (const env of Utils.toArray(travisYaml.env.matrix)) {

            const matches = env.match(/(?:NODEJS_VER|TRAVIS_NODE_VERSION|NODE_VER)="?(node\/)?(?<version>[\w./*]+)"?/);

            if (matches) {
                rawSet.add(matches.groups.version);
            }
        }
    }

    if (travisYaml.matrix) {

        for (const include of Utils.toArray(travisYaml.matrix.include)) {

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
        var travisYaml = await loadFile('.travis.yml', { yaml: true });
    }
    catch (err) {

        if (err.code === 'ENOENT') {
            return;
        }

        throw err;
    }

    return {
        travis: await internals.scan(travisYaml, { loadFile })
    };
};
