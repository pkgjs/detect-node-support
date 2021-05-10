'use strict';

const Fs = require('fs');
const Path = require('path');

const Contents = require('./contents');
const Utils = require('../utils');


exports.create = async (path) => {

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
        loadFolder: (folderPath) => {

            const fullPath = Path.join(path, folderPath);

            return Fs.existsSync(fullPath) ? Fs.readdirSync(fullPath) : [];
        },
        loadFile: (filename, options = {}) => {

            const fullPath = Path.join(path, filename);

            const buffer = Fs.readFileSync(fullPath);

            return Contents.convert(buffer, options);
        }
    };
};
