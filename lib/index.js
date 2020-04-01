'use strict';

const Deps = require('./deps');
const Package = require('./package');

exports.detect = async function (what, { deps } = {}) {

    const { result, meta } = await Package.detect(what);

    if (deps) {
        result.dependencies = await Deps.detect(meta);
    }

    return result;
};
