'use strict';

const GitUrlParse = require('git-url-parse');
const Path = require('path');
const Wreck = require('@hapi/wreck');


exports.detect = async ({ path, repository, packageName }) => {

    let packageJson;

    if (repository) {
        const parsedRepository = GitUrlParse(repository);

        const url = `https://raw.githubusercontent.com/${parsedRepository.full_name}/HEAD/package.json`;

        const { payload } = await Wreck.get(url);

        packageJson = JSON.parse(payload.toString());
    }

    if (path) {
        packageJson = require(Path.join(path, 'package.json'));
    }

    const { name, version } = packageJson;

    return { name, version };
};
