'use strict';

const Fs = require('fs');
const { URL } = require('url');

const Loader = require('./loader');


const internals = {};

internals.what = (what) => {

    if (typeof what !== 'string') {
        return what;
    }

    try {
        var url = new URL(what);
    }
    catch (err) {
        // do nothing - attempt to use the string as a package name
    }

    if (url) {
        return { repository: url.href };
    }

    if (Fs.existsSync(what)) {
        return { path: what };
    }

    if (what.includes('/') && !what.startsWith('@')) {
        return { repository: `https://github.com/${what}` };
    }

    return { packageName: what };
};


exports.detect = async (what) => {

    const { path, repository, packageName } = internals.what(what);

    const { loadFile, getCommit } = await Loader.create({ path, repository, packageName });

    const packageJson = await loadFile('package.json', { json: 'force' });

    const { name, version } = packageJson;

    return {
        name,
        version,
        packageJson,

        getCommit,
        loadFile
    };
};
