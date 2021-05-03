'use strict';

const Fs = require('fs');
const { URL } = require('url');

const GithubActions = require('./github-actions');
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

    if (what.split('/').length === 2 && !what.startsWith('@')) {
        return { repository: what };
    }

    return { packageName: what };
};


exports.detect = async (what) => {

    const { path, repository, packageName } = internals.what(what);

    const { loadFile, loadFolder, getCommit } = await Loader.create({ path, repository, packageName });

    const packageJson = await loadFile('package.json', { json: true });

    const meta = {
        packageJson,
        getCommit,
        loadFile,
        loadFolder
    };

    const result = {};

    result.name = packageJson.name;
    result.version = packageJson.version;
    result.commit = await meta.getCommit();
    result.timestamp = Date.now();

    Object.assign(result, ...await Promise.all([
        GithubActions.detect(meta),
        Travis.detect(meta),
        Engines.detect(meta)
    ]));

    return { result, meta };
};
