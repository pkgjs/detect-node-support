'use strict';

const Fs = require('fs');
const GitUrlParse = require('git-url-parse');
const Path = require('path');
const Wreck = require('@hapi/wreck');


const internals = {};


internals.createRepositoryLoader = (repository) => {

    const parsedRepository = GitUrlParse(repository);

    return async (filename) => {

        const url = `https://raw.githubusercontent.com/${parsedRepository.full_name}/HEAD/${filename}`;

        const { payload } = await Wreck.get(url);

        return payload;
    };
};


internals.createPathLoader = (path) => {

    return (filename) => {

        const fullPath = Path.join(path, filename);

        if (!Fs.existsSync(fullPath)) {
            return;
        }

        return Fs.readFileSync(fullPath);
    };
};


exports.create = ({ path, repository }) => {

    return repository
        ? internals.createRepositoryLoader(repository)
        : internals.createPathLoader(path);
};
