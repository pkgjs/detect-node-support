'use strict';

const Engines = require('./engines');
const Package = require('./package');
const Travis = require('./travis');

exports.detect = async function (what) {

    const packageInfo = await Package.detect(what);

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
