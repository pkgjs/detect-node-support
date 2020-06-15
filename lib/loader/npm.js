'use strict';

const Pacote = require('pacote');

const Constants = require('../constants');
const RepositoryLoader = require('./repository');

const internals = {};


internals.parseRepository = (packument) => {

    if (typeof packument.repository === 'string') {
        return packument.repository;
    }

    if (!packument.repository || !packument.repository.url) {
        throw new Error(`Unable to determine the git repository for ${packument.name}`);
    }

    return packument.repository.url;
};


exports.create = async (packageName) => {

    try {
        const packument = await Pacote.packument(packageName + '@latest', {
            'fullMetadata': true,
            'user-agent': Constants.userAgent
        });

        const repository = internals.parseRepository(packument);

        const repositoryLoader = RepositoryLoader.create(repository);

        return {
            ...repositoryLoader,
            loadFile: async (filename, options) => {

                const result = await repositoryLoader.loadFile(filename, options);

                if (filename === 'package.json' && result.name !== packageName) {
                    throw new Error(`${repository} does not contain ${packageName}. Monorepo not supported: https://github.com/pkgjs/detect-node-support/issues/6`);
                }

                return result;
            }
        };
    }
    catch (err) {

        if (err.statusCode === 404) {
            throw new Error(`Package ${packageName} does not exist`);
        }

        throw err;

    }
};
