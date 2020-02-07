'use strict';

const Loader = require('./loader');


exports.detect = async ({ path, repository, packageName }) => {

    const { loadFile, getCommit } = await Loader.create({ path, repository, packageName });

    const packageJson = await loadFile('package.json', { json: 'force' });

    const { name, version, engines } = packageJson;

    return {
        name,
        version,
        engines,

        getCommit,
        loadFile
    };
};
