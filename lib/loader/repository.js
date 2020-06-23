'use strict';

const GitUrlParse = require('git-url-parse');
const Wreck = require('@hapi/wreck');

const Logger = require('../logger');
const Utils = require('../utils');


const internals = {
    cache: new Map()
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
            Logger.log(['loader'], 'Loading: %s', url);

            if (options === undefined && internals.cache.has(url)) {
                Logger.log(['loader'], 'From cache: %s', url);
                return internals.cache.get(url);
            }

            try {
                const { payload } = await Wreck.get(url, options);

                if (options === undefined) {
                    internals.cache.set(url, payload);
                }

                Logger.log(['loader'], 'Loaded: %s', url);
                return payload;
            }
            catch (err) {

                if (err.data && err.data.res.statusCode === 404) {
                    Logger.log(['loader'], 'Not found: %s', url);
                    const error = new Error(`${repository} does not contain a ${filename}`);
                    error.code = 'ENOENT';
                    throw error;
                }

                Logger.error(['loader'], 'Failed to load: %s', url);
                throw err;
            }
        }
    };
};


exports.clearCache = () => {

    internals.cache = new Map();
};
