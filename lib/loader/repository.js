'use strict';

const Debug = require('debug');
const GitUrlParse = require('git-url-parse');
const Wreck = require('@hapi/wreck');

const Utils = require('../utils');


const internals = {
    cache: new Map(),
    log: Debug('detect-node-support:loader'),
    error: Debug('detect-node-support:error')
};


exports.create = (repository) => {

    if (repository.split('/').length === 2) {
        repository = `https://github.com/${repository}`;
    }

    const parsedRepository = GitUrlParse(repository);

    return {
        getCommit: async () => {

            const simpleGit = Utils.simpleGit();
            const httpRepository = GitUrlParse.stringify(parsedRepository, 'http');
            const result = await simpleGit.listRemote([httpRepository, 'HEAD']);
            const [head] = result.split(/\s+/);

            return head;
        },
        loadFile: async (filename, options) => {

            if (parsedRepository.source !== 'github.com') {
                throw new Error('Only github.com paths supported, feel free to PR at https://github.com/pkgjs/detect-node-support');
            }

            const url = `https://raw.githubusercontent.com/${parsedRepository.full_name}/HEAD/${filename}`;
            internals.log('Loading: %s', url);

            if (options === undefined && internals.cache.has(url)) {
                internals.log('From cache: %s', url);
                return internals.cache.get(url);
            }

            try {
                const { payload } = await Wreck.get(url, options);

                if (options === undefined) {
                    internals.cache.set(url, payload);
                }

                internals.log('Loaded: %s', url);
                return payload;
            }
            catch (err) {

                if (err.data && err.data.res.statusCode === 404) {
                    internals.log('Not found: %s', url);
                    const error = new Error(`${repository} does not contain a ${filename}`);
                    error.code = 'ENOENT';
                    throw error;
                }

                internals.error('Failed to load: %s', url);
                throw err;
            }
        }
    };
};


exports.clearCache = () => {

    internals.cache = new Map();
};
