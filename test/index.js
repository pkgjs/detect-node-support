'use strict';

const Fs = require('fs');
const Nock = require('nock');
const Path = require('path');
const Sinon = require('sinon');
const SimpleGit = require('simple-git/promise');
const Tmp = require('tmp');
const Wreck = require('@hapi/wreck');

const NodeSupport = require('..');

const Utils = require('../lib/utils');


const { describe, it, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');


const internals = {
    tmpObjects: []
};

internals.prepareFixture = async ({ travisYml, packageJson, git = true } = {}) => {

    const tmpObj = Tmp.dirSync({ unsafeCleanup: true });

    internals.tmpObjects.push(tmpObj);

    if (travisYml) {
        Fs.copyFileSync(Path.join(__dirname, 'fixtures', travisYml), Path.join(tmpObj.name, '.travis.yml'));
    }

    if (packageJson !== false) {
        Fs.writeFileSync(Path.join(tmpObj.name, 'package.json'), JSON.stringify(packageJson || {
            name: 'test-module',
            version: '0.0.0-development'
        }));
    }

    if (git) {
        const simpleGit = SimpleGit(tmpObj.name);
        await simpleGit.init();
        await simpleGit.add('./*');
        await simpleGit.commit('initial commit', ['--no-gpg-sign']);
    }

    return tmpObj.name;
};


internals.assertCommit = (result) => {

    expect(result.commit).to.match(/^[0-9a-f]{40}$/);
    delete result.commit;
};

describe('detect-node-support', () => {

    let listRemoteStub;

    beforeEach(() => {

        listRemoteStub = Sinon.stub().throws();

        Sinon.useFakeTimers({
            now: +new Date('2020-02-02T20:00:02Z'),
            toFake: ['Date']
        });

        Sinon.stub(Utils, 'simpleGit').callsFake((...args) => {

            const simpleGit = SimpleGit(...args);

            Sinon.stub(simpleGit, 'listRemote').callsFake(listRemoteStub);

            return simpleGit;
        });

        if (!Nock.isActive()) {
            Nock.activate();
        }

        Nock.disableNetConnect();

        Nock('https://raw.githubusercontent.com')
            .persist()
            .get('/nodejs/Release/master/schedule.json')
            .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'node-release-schedule.json')));

        Nock('https://nodejs.org')
            .persist()
            .get('/dist/index.json')
            .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'node-release-dist.json')));
    });

    afterEach(() => {

        internals.tmpObjects.forEach((tmpObj) => {

            tmpObj.removeCallback();
        });

        internals.tmpObjects = [];

        Sinon.restore();

        Nock.restore();
        Nock.cleanAll();
        Nock.enableNetConnect();
    });

    describe('detect()', () => {

        describe('path', () => {

            it('returns node versions from `.travis.yml` at the path', async () => {

                const path = Path.join(__dirname, '..');

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13'],
                        resolved: {
                            '10': '10.19.0',
                            '12': '12.15.0',
                            '13': '13.8.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('leaves out `travis` when no `.travis.yml` present', async () => {

                const path = await internals.prepareFixture();

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000
                });
            });

            it('returns the single node version', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'testing-single-version.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10'],
                        resolved: { '10': '10.19.0' }
                    }
                });
            });

            it('returns default node version', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'testing-minimal.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['latest'],
                        resolved: { latest: '13.8.0' }
                    }
                });
            });

            it('returns empty array when no node detected', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'testing-no-node.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: [],
                        resolved: {}
                    }
                });
            });

            it('returns node versions from matrix env vars (NODEJS_VER)', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'kangax-html-minifier.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['6', '8', '10', 'latest'],
                        resolved: {
                            '6': '6.17.1',
                            '8': '8.17.0',
                            '10': '10.19.0',
                            latest: '13.8.0'
                        }
                    }
                });
            });

            it('returns node versions from matrix env vars (TRAVIS_NODE_VERSION)', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'nodejs-nan.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['0.10', '0.12', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'lts/*'],
                        resolved: {
                            '0.10': '0.10.48',
                            '0.12': '0.12.18',
                            '4': '4.9.1',
                            '5': '5.12.0',
                            '6': '6.17.1',
                            '7': '7.10.1',
                            '8': '8.17.0',
                            '9': '9.11.2',
                            '10': '10.19.0',
                            '11': '11.15.0',
                            '12': '12.15.0',
                            '13': '13.8.0',
                            'lts/*': '12.15.0'
                        }
                    }
                });
            });

            it('returns node versions from matrix env vars (NODE_VER)', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'reactivex-rxjs.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['4', '6', '7'],
                        resolved: {
                            '4': '4.9.1',
                            '6': '6.17.1',
                            '7': '7.10.1'
                        }
                    }
                });
            });

            it('handles non-matching matrix env vars', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'caolan-async.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['8', '10', '12'],
                        resolved: {
                            '8': '8.17.0',
                            '10': '10.19.0',
                            '12': '12.15.0'
                        }
                    }
                });
            });

            it('returns node versions from matrix include', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'nodejs-readable-stream.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['6', '8', '9', '10', '12', 'stable'],
                        resolved: {
                            '6': '6.17.1',
                            '8': '8.17.0',
                            '9': '9.11.2',
                            '10': '10.19.0',
                            '12': '12.15.0',
                            'stable': '13.8.0'
                        }
                    }
                });
            });

            it('handles single matrix include', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'postcss-autoprefixer.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['node', '10', '12', '8', '6'],
                        resolved: {
                            'node': '13.8.0',
                            '10': '10.19.0',
                            '12': '12.15.0',
                            '8': '8.17.0',
                            '6': '6.17.1'
                        }
                    }
                });
            });

            it('handles matrix includes without node versions', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'shinn-is-resolvable.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['node'],
                        resolved: { node: '13.8.0' }
                    }
                });
            });

            it('handles missing env.matrix', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'testing-no-env-matrix.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['latest'],
                        resolved: { latest: '13.8.0' }
                    }
                });
            });

            it('handles invalid node versions', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'testing-invalid-version.yml'
                });

                const result = await NodeSupport.detect({ path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['i-am-not-a-node-version'],
                        resolved: { 'i-am-not-a-node-version': false }
                    }
                });
            });

            it('throws when path is not a git repo', async () => {

                const path = await internals.prepareFixture({ git: false });

                await expect(NodeSupport.detect({ path }))
                    .to.reject(`${path} is not a git repository`);
            });

            it('throws when path does not have a package.json', async () => {

                const path = await internals.prepareFixture({
                    travisYml: 'testing-no-node.yml',
                    packageJson: false
                });

                await expect(NodeSupport.detect({ path }))
                    .to.reject(`${path} does not contain a package.json`);
            });
        });

        describe('repository', () => {

            it('returns node versions from `.travis.yml` in the repository', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                const result = await NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' });

                expect(listRemoteStub.callCount).to.equal(1);
                expect(listRemoteStub.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13'],
                        resolved: {
                            '10': '10.19.0',
                            '12': '12.15.0',
                            '13': '13.8.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('leaves out `travis` when no `.travis.yml` present', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(404);

                const result = await NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' });

                expect(listRemoteStub.callCount).to.equal(1);
                expect(listRemoteStub.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    engines: '>=10'
                });
            });

            it('throws when loading `.travis.yml` fails', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(500);

                await expect(NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' }))
                    .to.reject('Response Error: 500 null'); // the null is a Nock/Wreck implementation detail
            });

            it('throws when repository does not have a package.json', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(404)
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                await expect(NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' }))
                    .to.reject(`git+https://github.com/pkgjs/detect-node-support.git does not contain a package.json`);
            });

            it('rethrows server errors', async () => {

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(500)
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                await expect(NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' }))
                    .to.reject(/Response Error/);
            });

            it('rethrows generic errors', async () => {

                const err = new Error('Something went wrong');

                Sinon.stub(Wreck, 'get').throws(err);

                await expect(NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' }))
                    .to.reject('Something went wrong');
            });

            it('throws when a package does not live on public github.com', async () => {

                await expect(NodeSupport.detect({ repository: 'git+https://github.example.com/pkgjs/detect-node-support.git' }))
                    .to.reject('Only github.com paths supported, feel free to PR at https://github.com/pkgjs/detect-node-support');
            });
        });

        describe('packageName', () => {

            it('returns node versions from `.travis.yml` in the package repository', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')));

                const result = await NodeSupport.detect({ packageName: 'detect-node-support' });

                expect(listRemoteStub.callCount).to.equal(1);
                expect(listRemoteStub.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13'],
                        resolved: {
                            '10': '10.19.0',
                            '12': '12.15.0',
                            '13': '13.8.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('leaves out `travis` when no `.travis.yml` present', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(404);

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')));

                const result = await NodeSupport.detect({ packageName: 'detect-node-support' });

                expect(listRemoteStub.callCount).to.equal(1);
                expect(listRemoteStub.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    engines: '>=10'
                });
            });

            it('throws when package does not exist in the registry', async () => {

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(404);

                await expect(NodeSupport.detect({ packageName: 'detect-node-support' }))
                    .to.reject(`Package detect-node-support does not exist`);
            });

            it('rethrows registry server errors', async () => {

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(500);

                await expect(NodeSupport.detect({ packageName: 'detect-node-support' }))
                    .to.reject(/Internal Server Error/);
            });

            it('rethrows generic errors', async () => {

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')));

                const err = new Error('Something went wrong');

                Sinon.stub(Wreck, 'get').throws(err);

                await expect(NodeSupport.detect({ packageName: 'detect-node-support' }))
                    .to.reject('Something went wrong');
            });

            it('throws when packument does not contain a `repository` field', async () => {

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, JSON.stringify({ name: 'detect-node-support' }));

                await expect(NodeSupport.detect({ packageName: 'detect-node-support' }))
                    .to.reject('Unable to determine the git repository for detect-node-support');
            });

            it('throws when packument does not contain a `repository.url` field', async () => {

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, JSON.stringify({ name: 'detect-node-support', repository: {} }));

                await expect(NodeSupport.detect({ packageName: 'detect-node-support' }))
                    .to.reject('Unable to determine the git repository for detect-node-support');
            });

            it('returns node versions from `.travis.yml` in the package repository (string repository)', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, JSON.stringify({
                        name: 'detect-node-support',
                        repository: 'git+https://github.com/pkgjs/detect-node-support.git'
                    }));

                const result = await NodeSupport.detect({ packageName: 'detect-node-support' });

                expect(listRemoteStub.callCount).to.equal(1);
                expect(listRemoteStub.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13'],
                        resolved: {
                            '10': '10.19.0',
                            '12': '12.15.0',
                            '13': '13.8.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('throws when repo package name does not match', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(200, JSON.stringify({ name: 'something-else' }))
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')));

                await expect(NodeSupport.detect({ packageName: 'detect-node-support' }))
                    .to.reject('git+https://github.com/pkgjs/detect-node-support.git does not contain detect-node-support. Monorepo not supported: https://github.com/pkgjs/detect-node-support/issues/6');
            });
        });

        describe('string (auto-detect)', () => {

            it('returns node versions from `.travis.yml` at the path', async () => {

                const path = Path.join(__dirname, '..');

                const result = await NodeSupport.detect(path);

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13'],
                        resolved: {
                            '10': '10.19.0',
                            '12': '12.15.0',
                            '13': '13.8.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('returns node versions from `.travis.yml` in the repository (url case)', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                const result = await NodeSupport.detect('git+https://github.com/pkgjs/detect-node-support.git');

                expect(listRemoteStub.callCount).to.equal(1);
                expect(listRemoteStub.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13'],
                        resolved: {
                            '10': '10.19.0',
                            '12': '12.15.0',
                            '13': '13.8.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('returns node versions from `.travis.yml` in the repository ("org/repo" case)', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                const result = await NodeSupport.detect('pkgjs/detect-node-support');

                expect(listRemoteStub.callCount).to.equal(1);
                expect(listRemoteStub.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13'],
                        resolved: {
                            '10': '10.19.0',
                            '12': '12.15.0',
                            '13': '13.8.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('returns node versions from `.travis.yml` in the package repository', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/detect-node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/detect-node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')));

                const result = await NodeSupport.detect('detect-node-support');

                expect(listRemoteStub.callCount).to.equal(1);
                expect(listRemoteStub.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13'],
                        resolved: {
                            '10': '10.19.0',
                            '12': '12.15.0',
                            '13': '13.8.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('returns node versions from `.travis.yml` in the package repository (scoped)', async () => {

                listRemoteStub
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://raw.githubusercontent.com')
                    .get('/hapijs/hapi/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'hapi-package.json')))
                    .get('/hapijs/hapi/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                Nock('https://registry.npmjs.org')
                    .get('/@hapi%2fhapi')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'hapi-package.json')));

                const result = await NodeSupport.detect('@hapi/hapi');

                expect(listRemoteStub.callCount).to.equal(1);
                expect(listRemoteStub.args[0]).to.equal([['http://github.com/hapijs/hapi.git', 'HEAD']]);

                expect(result).to.equal({
                    name: '@hapi/hapi',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10', '12', '13'],
                        resolved: {
                            '10': '10.19.0',
                            '12': '12.15.0',
                            '13': '13.8.0'
                        }
                    }
                });
            });
        });
    });
});
