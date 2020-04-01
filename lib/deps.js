'use strict';

const { Arborist } = require('@npmcli/arborist');
const Fs = require('fs');
const Path = require('path');
const Tempy = require('tempy');


const internals = {};


internals.walk = (node, callback) => {

    callback(node);

    node.children.forEach((child) => {

        internals.walk(child, callback);
    });
};


exports.resolve = async ({ packageJson, lockfile }) => {

    const path = Tempy.directory();
    Fs.writeFileSync(Path.join(path, 'package.json'), JSON.stringify(packageJson, null, '  '));
    Fs.writeFileSync(Path.join(path, 'package-lock.json'), JSON.stringify(lockfile, null, '  '));

    const arborist = new Arborist({ path });

    await arborist.buildIdealTree();

    const map = {};

    internals.walk(arborist.idealTree, (node) => {

        if (node === arborist.idealTree) {
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
