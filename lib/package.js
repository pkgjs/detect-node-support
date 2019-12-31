'use strict';

const Loader = require('./loader');


exports.detect = async ({ path, repository, packageName }) => {

    const loadFile = Loader.create({ path, repository, packageName });

    const packageJson = JSON.parse((await loadFile('package.json')).toString());

    const { name, version } = packageJson;

    return { name, version, loadFile };
};
