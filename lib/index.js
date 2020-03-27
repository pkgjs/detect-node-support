'use strict';

const Fs = require('fs');
const { URL } = require('url');

const Engines = require('./engines');
const Package = require('./package');
const Travis = require('./travis');

exports.detect = async function ({ path, repository, packageName }) {

    const packageInfo = await Package.detect({ path, repository, packageName });

    const result = {};

    result.name = packageInfo.name;
    result.version = packageInfo.version;
    result.commit = await packageInfo.getCommit();
    result.timestamp = Date.now();

    const travis = await Travis.detect(packageInfo);
    const engines = await Engines.detect(packageInfo);

    Object.assign(result, travis, engines);

    return result;
};

// eslint-disable-next-line require-await
exports.autoDetect = async function (what) {

    try {
        var url = new URL(what);
    }
    catch (err) {
        if (err.code !== 'ERR_INVALID_URL') {
            throw err;
        }
    }

    if (url) {
        return exports.detect({ repository: url.href });
    }

    if (Fs.existsSync(what)) {
        return exports.detect({ path: what });
    }

    if (what.includes('/') && !what.startsWith('@')) {
        return exports.detect({ repository: `https://github.com/${what}` });
    }

    return exports.detect({ packageName: what });
};
