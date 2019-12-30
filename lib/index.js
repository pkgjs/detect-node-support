'use strict';

const Path = require('path');

const Travis = require('./travis');

exports.detect = ({ path }) => {

    const packageJson = require(Path.join(path, 'package.json'));

    const { name, version } = packageJson;

    const result = { name, version };

    const travis = Travis.detect({ path });

    if (travis) {
        result.travis = travis;
    }

    return result;
};
