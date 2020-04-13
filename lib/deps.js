'use strict';

const { Arborist } = require('@npmcli/arborist');
const Fs = require('fs');
const Path = require('path');
const Tempy = require('tempy');

const Package = require('./package');

const internals = {};


internals.walk = (node, callback) => {

    callback(node);

    node.children.forEach((child) => {

        internals.walk(child, callback);
    });
};


exports.resolve = async ({ packageJson, lockfile }, options) => {

    const { deep, dev } = options;

    const path = Tempy.directory();
    Fs.writeFileSync(Path.join(path, 'package.json'), JSON.stringify(packageJson, null, '  '));

    if (lockfile) {
        Fs.writeFileSync(Path.join(path, 'package-lock.json'), JSON.stringify(lockfile, null, '  '));
    }

    const arborist = new Arborist({ path });

    await arborist.buildIdealTree();

    const map = {};

    internals.walk(arborist.idealTree, (node) => {

        if (node.isTop) {
            return;
        }

        if (!dev && node.dev) {
            // only include dev deps when `options.dev` flag is set
            return;
        }

        if (!deep && !node.parent.isTop) {
            // only include deep deps when `options.deep` flag is set
            return;
        }

        map[node.name] = map[node.name] || new Set();
        map[node.name].add(node.package.version);
    });

    const result = {};

    for (const name of Object.keys(map).sort()) {
        result[name] = [...map[name]];
    }

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

    const versions = await exports.resolve({ packageJson, lockfile }, options);

    const support = [];

    for (const packageName of Object.keys(versions)) {
        try {
            const { result } = await Package.detect({ packageName });
            support.push(result);
        }
        catch (err) {
            console.warn(`Failed to detect support for ${packageName}: ${err && err.message}`);
        }
    }

    return { support, versions };
};
