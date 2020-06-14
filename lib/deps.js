'use strict';

const Debug = require('debug');
const { Arborist } = require('@npmcli/arborist');
const Fs = require('fs');
const Path = require('path');
const Tmp = require('tmp');

const Package = require('./package');
const Utils = require('./utils');

const internals = {
    log: Debug('detect-node-support')
};


internals.resolve = async ({ packageJson, lockfile }, options) => {

    const tmpDir = Tmp.dirSync({ unsafeCleanup: true });
    const path = tmpDir.name;

    Fs.writeFileSync(Path.join(path, 'package.json'), JSON.stringify(packageJson, null, '  '));

    if (lockfile) {
        Fs.writeFileSync(Path.join(path, 'package-lock.json'), JSON.stringify(lockfile, null, '  '));
    }

    const arborist = new Arborist({ path });

    await arborist.buildIdealTree();

    const map = {};

    for (const dep of arborist.idealTree.inventory.values()) {

        if (!options.dev && dep.dev) {
            // only include dev deps when `options.dev` flag is set
            continue;
        }

        if (!options.deep && ![...dep.edgesIn].some(({ from }) => from === arborist.idealTree)) {
            continue;
        }

        map[dep.name] = map[dep.name] || new Set();
        map[dep.name].add(dep.package.version);
    }

    const result = {};

    for (const name of Object.keys(map).sort()) {
        result[name] = [...map[name]];
    }

    tmpDir.removeCallback();

    return result;
};

internals.tryLoad = async (loadFile, filename) => {

    try {
        return await loadFile(filename, { json: true });
    }
    catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
};

exports.detect = async ({ packageJson, loadFile }, options) => {

    const lockfile = (await internals.tryLoad(loadFile, 'package-lock.json')) || (await internals.tryLoad(loadFile, 'npm-shrinkwrap.json'));
    internals.log(lockfile ? 'Lock file present' : 'Lock file missing - things will be a bit slower');

    const versions = await internals.resolve({ packageJson, lockfile }, options);

    const support = [];
    const errors = {};
    let hasErrors = false;

    const packages = Object.keys(versions).sort();
    const n = packages.length;

    for (let i = 0; i < n; ++i) {

        const packageName = packages[i];
        internals.log(`Resolving dependency ${i + 1} of ${n}: ${packageName}`);

        try {
            const { result } = await Package.detect({ packageName });
            support.push(result);
        }
        catch (err) {
            hasErrors = true;
            errors[packageName] = {
                message: Utils.getErrorMessage(err)
            };
        }
    }

    const result = { support, versions };

    if (hasErrors) {
        result.errors = errors;
    }

    return result;
};
