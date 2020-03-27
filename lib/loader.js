'use strict';

const Fs = require('fs');
const GitUrlParse = require('git-url-parse');
const Package = require('../package.json');
const Pacote = require('pacote');
const Path = require('path');
const Wreck = require('@hapi/wreck');

const Utils = require('./utils');

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


internals.createPackageLoader = async (packageName) => {

    try {
        const packument = await Pacote.packument(packageName + '@latest', {
            'fullMetadata': true,
            'user-agent': `${Package.name}@${Package.version}, see ${Package.homepage}`
        });

        const repository = internals.parseRepository(packument);

        const repositoryLoader = internals.createRepositoryLoader(repository);

        return {
            ...repositoryLoader,
            loadFile: async (filename, options) => {

                const result = await repositoryLoader.loadFile(filename, options);

                if (filename === 'package.json' && result.name !== packageName) {
                    throw new Error(`${repository} does not contain ${packageName}`);
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


internals.createRepositoryLoader = (repository) => {

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

            try {
                const { payload } = await Wreck.get(url, options);

                return payload;
            }
            catch (err) {

                if (err.output && err.output.statusCode === 404) {
                    const error = new Error(`${repository} does not contain a ${filename}`);
                    error.code = 'ENOENT';
                    throw error;
                }

                throw err;
            }
        }
    };
};


internals.createPathLoader = async (path) => {

    const simpleGit = Utils.simpleGit(path);
    const isRepo = await simpleGit.checkIsRepo();

    if (!isRepo) {
        throw new Error(`${path} is not a git repository`);
    }

    if (!Fs.existsSync(Path.join(path, 'package.json'))) {
        throw new Error(`${path} does not contain a package.json`);
    }

    return {
        getCommit: () => {

            return simpleGit.revparse(['HEAD']);
        },
        loadFile: (filename, options = {}) => {

            const fullPath = Path.join(path, filename);

            const buffer = Fs.readFileSync(fullPath);

            if (options.json) {
                return JSON.parse(buffer.toString());
            }

            return buffer;
        }
    };
};


exports.create = ({ path, repository, packageName }) => {

    if (repository) {
        return internals.createRepositoryLoader(repository);
    }

    if (packageName) {
        return internals.createPackageLoader(packageName);
    }

    return internals.createPathLoader(path);
};
