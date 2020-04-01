'use strict';

const Fs = require('fs');
const { URL } = require('url');

const Engines = require('./engines');
const Loader = require('./loader');
const Travis = require('./travis');


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

    const meta = {
        packageJson,
        getCommit,
        loadFile
    };

    const result = {};

    result.name = packageJson.name;
    result.version = packageJson.version;
    result.commit = await meta.getCommit();
    result.timestamp = Date.now();

    const travis = await Travis.detect(meta);
    const engines = await Engines.detect(meta);

    Object.assign(result, travis, engines);

    return { result, meta };
};
