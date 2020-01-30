'use strict';

const Loader = require('./loader');


exports.detect = async ({ path, repository, packageName }) => {

    const { loadFile } = await Loader.create({ path, repository, packageName });

    const packageJson = JSON.parse((await loadFile('package.json')).toString());

    const { name, version, engines } = packageJson;

    return { name, version, engines, loadFile };
};
