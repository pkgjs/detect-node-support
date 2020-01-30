'use strict';

const Package = require('./package');
const Travis = require('./travis');

exports.detect = async ({ path, repository, packageName }) => {

    const packageInfo = await Package.detect({ path, repository, packageName });

    const result = {};

    result.name = packageInfo.name;
    result.version = packageInfo.version;

    const travis = await Travis.detect(packageInfo);

    if (travis) {
        result.travis = travis;
    }

    result.timestamp = Date.now();

    return result;
};
