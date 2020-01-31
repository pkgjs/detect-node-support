'use strict';

const Engines = require('./engines');
const Package = require('./package');
const Travis = require('./travis');

exports.detect = async ({ path, repository, packageName }) => {

    const packageInfo = await Package.detect({ path, repository, packageName });

    const result = {};

    result.name = packageInfo.name;
    result.version = packageInfo.version;
    result.commit = await packageInfo.getCommit();

    const travis = await Travis.detect(packageInfo);

    if (travis) {
        result.travis = travis;
    }

    const engines = await Engines.detect(packageInfo);

    if (engines) {
        result.engines = engines;
    }

    result.timestamp = Date.now();

    return result;
};
