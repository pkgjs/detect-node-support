'use strict';

const Path = require('path');

exports.detect = ({ path, repository, packageName }) => {

    const packageJson = require(Path.join(path, 'package.json'));

    const { name, version } = packageJson;

    return { name, version };
};
