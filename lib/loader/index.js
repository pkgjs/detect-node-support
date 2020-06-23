'use strict';

const NpmLoader = require('./npm');
const PathLoader = require('./path');
const RepositoryLoader = require('./repository');


exports.create = ({ path, repository, packageName }) => {

    if (repository) {
        return RepositoryLoader.create(repository);
    }

    if (packageName) {
        return NpmLoader.create(packageName);
    }

    return PathLoader.create(path);
};
