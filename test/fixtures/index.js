'use strict';

const Fs = require('fs');
const Nock = require('nock');
const Path = require('path');
const SimpleGit = require('simple-git/promise');
const Sinon = require('sinon');
const Tmp = require('tmp');

const RepositoryLoader = require('../../lib/loader/repository');
const Utils = require('../../lib/utils');


module.exports = class TestContext {

    constructor() {

        this._cleanup = [];
        this.stubs = {};

        Sinon.useFakeTimers({
            now: +new Date('2020-02-02T20:00:02Z'),
            toFake: ['Date']
        });

        this._mockSimpleGit();
        this._mockNetwork();
    }

    cleanup() {

        RepositoryLoader.clearCache();

        Sinon.restore();

        this._cleanup.forEach((cleanup) => cleanup());

        this._cleanup = [];
    }

    _mockSimpleGit() {

        this.stubs.listRemote = Sinon.stub().throws();

        Sinon.stub(Utils, 'simpleGit').callsFake((...args) => {

            const simpleGit = SimpleGit(...args);

            Sinon.stub(simpleGit, 'listRemote').callsFake(this.stubs.listRemote);

            return simpleGit;
        });
    }

    _mockNetwork() {

        if (!Nock.isActive()) {
            Nock.activate();
        }

        Nock.disableNetConnect();

        Nock('https://raw.githubusercontent.com')
            .persist()
            .get('/nodejs/Release/master/schedule.json')
            .reply(200, Fs.readFileSync(Path.join(__dirname, 'node-release-schedule.json')));

        Nock('https://nodejs.org')
            .persist()
            .get('/dist/index.json')
            .reply(200, Fs.readFileSync(Path.join(__dirname, 'node-release-dist.json')));

        this._cleanup.push(() => {

            Nock.restore();
            Nock.cleanAll();
            Nock.enableNetConnect();
        });
    }

    async setupRepoFolder({ travisYml, partials, packageJson, npmShrinkwrapJson, packageLockJson, git = true } = {}) {

        const tmpObj = Tmp.dirSync({ unsafeCleanup: true });

        this.path = tmpObj.name;

        this._cleanup.push(() => tmpObj.removeCallback());

        if (travisYml) {
            Fs.copyFileSync(Path.join(__dirname, 'travis-ymls', travisYml), Path.join(this.path, '.travis.yml'));
        }

        if (partials) {
            Fs.mkdirSync(Path.join(this.path, 'partials'));
            const partialYmls = [
                'circular.yml',
                'commitish.yml',
                'indirect-node-14.yml',
                'merge-invalid.yml',
                'node-10.yml',
                'node-12.yml',
                'node-14.yml'
            ];
            for (const fn of partialYmls) {
                Fs.copyFileSync(Path.join(__dirname, 'travis-ymls', 'testing-imports', 'partials', fn), Path.join(this.path, 'partials', fn));
            }
        }

        if (packageJson !== false) {
            Fs.writeFileSync(Path.join(this.path, 'package.json'), JSON.stringify(packageJson || {
                name: 'test-module',
                version: '0.0.0-development'
            }));
        }

        if (npmShrinkwrapJson) {
            Fs.copyFileSync(Path.join(__dirname, npmShrinkwrapJson), Path.join(this.path, 'npm-shrinkwrap.json'));
        }

        if (packageLockJson) {
            Fs.copyFileSync(Path.join(__dirname, packageLockJson), Path.join(this.path, 'package-lock.json'));
        }

        if (git) {
            const simpleGit = SimpleGit(this.path);
            await simpleGit.init();
            await simpleGit.add('./*');
            await simpleGit.commit('initial commit', ['--no-gpg-sign']);
        }
    }

};
