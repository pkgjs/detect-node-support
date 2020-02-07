'use strict';

const Fs = require('fs');
const GitUrlParse = require('git-url-parse');
const Package = require('../package.json');
const Pacote = require('pacote');
const Path = require('path');
const Wreck = require('@hapi/wreck');

const Utils = require('./utils');

const internals = {};


internals.createPackageLoader = async (packageName) => {

    try {
        const packument = await Pacote.packument(packageName + '@latest', {
            'fullMetadata': true,
            'user-agent': `${Package.name}@${Package.version}, see ${Package.homepage}`
        });

        return internals.createRepositoryLoader(packument.repository.url);
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
        loadFile: async (filename) => {

            if (parsedRepository.source !== 'github.com') {
                throw new Error('Only github.com paths supported, feel free to PR at https://github.com/pkgjs/node-support');
            }

            const url = `https://raw.githubusercontent.com/${parsedRepository.full_name}/HEAD/${filename}`;

            try {
                const { payload } = await Wreck.get(url);

                return payload;
            }
            catch (err) {

                if (err.output && err.output.statusCode === 404) {
                    throw new Error(`${repository} does not contain a ${filename}`);
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
        loadFile: (filename) => {

            const fullPath = Path.join(path, filename);

            if (!Fs.existsSync(fullPath)) {
                return;
            }

            return Fs.readFileSync(fullPath);
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
