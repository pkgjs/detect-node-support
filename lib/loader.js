'use strict';

const Fs = require('fs');
const GitUrlParse = require('git-url-parse');
const Path = require('path');
const SimpleGit = require('simple-git/promise');
const Wreck = require('@hapi/wreck');


const internals = {};


internals.createRepositoryLoader = (repository) => {

    const parsedRepository = GitUrlParse(repository);

    return {
        loadFile: async (filename) => {

            if (parsedRepository.source !== 'github.com') {
                throw new Error('Only github.com paths supported, feel free to PR at https://github.com/pkgjs/node-support');
            }

            const url = `https://raw.githubusercontent.com/${parsedRepository.full_name}/HEAD/${filename}`;

            const { payload } = await Wreck.get(url);

            return payload;
        }
    };
};


internals.createPathLoader = async (path) => {

    const isRepo = await SimpleGit(path).checkIsRepo();

    if (!isRepo) {
        throw new Error(`${path} is not a git repository`);
    }

    return {
        loadFile: (filename) => {

            const fullPath = Path.join(path, filename);

            if (!Fs.existsSync(fullPath)) {
                return;
            }

            return Fs.readFileSync(fullPath);
        }
    };
};


exports.create = ({ path, repository }) => {

    return repository
        ? internals.createRepositoryLoader(repository)
        : internals.createPathLoader(path);
};
