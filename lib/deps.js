'use strict';

const { Arborist } = require('@npmcli/arborist');
const Fs = require('fs');
const Path = require('path');
const Tmp = require('tmp');

const Package = require('./package');
const Utils = require('./utils');

const internals = {};


internals.walk = (node, callback) => {

    callback(node);

    node.children.forEach((child) => {

        internals.walk(child, callback);
    });
};


internals.resolve = async ({ packageJson, lockfile }, options) => {

    const { deep, dev } = options;

    const tmpDir = Tmp.dirSync({ unsafeCleanup: true });
    const path = tmpDir.name;

    Fs.writeFileSync(Path.join(path, 'package.json'), JSON.stringify(packageJson, null, '  '));

    if (lockfile) {
        Fs.writeFileSync(Path.join(path, 'package-lock.json'), JSON.stringify(lockfile, null, '  '));
    }

    const direct = new Set();
    ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].forEach((depType) => {

        if (!packageJson[depType]) {
            return;
        }

        Object.keys(packageJson[depType]).forEach((dep) => direct.add(dep));
    });

    const arborist = new Arborist({ path });

    await arborist.buildIdealTree();

    const map = {};

    internals.walk(arborist.idealTree, (node) => {

        if (node.isRoot) {
            return;
        }

        if (!dev && node.dev) {
            // only include dev deps when `options.dev` flag is set
            return;
        }

        if (!deep && !node.parent.isRoot) {
            // only include deep deps when `options.deep` flag is set
            return;
        }

        if (!deep && !direct.has(node.name)) {
            // only include deep deps when `options.deep` flag is set
            // workaround for https://github.com/npm/arborist/issues/60
            return;
        }

        map[node.name] = map[node.name] || new Set();
        map[node.name].add(node.package.version);
    });

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

    const versions = await internals.resolve({ packageJson, lockfile }, options);

    const support = [];
    const errors = {};
    let hasErrors = false;

    for (const packageName of Object.keys(versions).sort()) {
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
