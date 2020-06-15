'use strict';

const Fs = require('fs');
const Nock = require('nock');
const Path = require('path');
const Sinon = require('sinon');

const NodeSupport = require('..');

const OctokitWrapper = require('../lib/loader/octokit-wrapper');
const TestContext = require('./fixtures');


const { describe, it, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');


const internals = {};


internals.assertCommit = (result) => {

    expect(result.commit).to.match(/^[0-9a-f]{40}$/);
    delete result.commit;
};

describe('detect-node-support', () => {

    let fixture;

    beforeEach(() => {

        fixture = new TestContext();
    });

    afterEach(() => {

        fixture.cleanup();
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
                        raw: ['14', '12', '10'],
                        resolved: {
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '14': '14.3.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('leaves out `travis` when no `.travis.yml` present', async () => {

                await fixture.setupRepoFolder();

                const result = await NodeSupport.detect({ path: fixture.path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000
                });
            });

            it('returns the single node version', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'testing-single-version.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['10'],
                        resolved: { '10': '10.20.1' }
                    }
                });
            });

            it('returns default node version', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'testing-minimal.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['latest'],
                        resolved: { latest: '13.14.0' }
                    }
                });
            });

            it('returns empty array when no node detected', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'testing-no-node.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

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

                await fixture.setupRepoFolder({
                    travisYml: 'kangax-html-minifier.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

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
                            '10': '10.20.1',
                            latest: '13.14.0'
                        }
                    }
                });
            });

            it('returns node versions from matrix env vars (TRAVIS_NODE_VERSION)', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'nodejs-nan.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

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
                            '10': '10.20.1',
                            '11': '11.15.0',
                            '12': '12.17.0',
                            '13': '13.14.0',
                            'lts/*': '12.17.0'
                        }
                    }
                });
            });

            it('returns node versions from matrix env vars (NODE_VER)', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'reactivex-rxjs.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

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

                await fixture.setupRepoFolder({
                    travisYml: 'caolan-async.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['8', '10', '12'],
                        resolved: {
                            '8': '8.17.0',
                            '10': '10.20.1',
                            '12': '12.17.0'
                        }
                    }
                });
            });

            it('returns node versions from matrix include', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'nodejs-readable-stream.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

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
                            '10': '10.20.1',
                            '12': '12.17.0',
                            'stable': '13.14.0'
                        }
                    }
                });
            });

            it('handles single matrix include', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'postcss-autoprefixer.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['node', '10', '12', '8', '6'],
                        resolved: {
                            'node': '13.14.0',
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '8': '8.17.0',
                            '6': '6.17.1'
                        }
                    }
                });
            });

            it('handles matrix includes without node versions', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'shinn-is-resolvable.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['node'],
                        resolved: { node: '13.14.0' }
                    }
                });
            });

            it('handles missing env.matrix', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'testing-no-env-matrix.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['latest'],
                        resolved: { latest: '13.14.0' }
                    }
                });
            });

            it('handles invalid node versions', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'testing-invalid-version.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

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

            it('handles duplicate key in .travis.yml', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'npm-promzard.yml'
                });

                const result = await NodeSupport.detect({ path: fixture.path });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['0.8', '0.10', '0.12', 'iojs'],
                        resolved: {
                            '0.8': '0.8.28',
                            '0.10': '0.10.48',
                            '0.12': '0.12.18',
                            'iojs': false
                        }
                    }
                });
            });

            it('throws when path is not a git repo', async () => {

                await fixture.setupRepoFolder({ git: false });

                await expect(NodeSupport.detect({ path: fixture.path }))
                    .to.reject(`${fixture.path} is not a git repository`);
            });

            it('throws when path does not have a package.json', async () => {

                await fixture.setupRepoFolder({
                    travisYml: 'testing-no-node.yml',
                    packageJson: false
                });

                await expect(NodeSupport.detect({ path: fixture.path }))
                    .to.reject(`${fixture.path} does not contain a package.json`);
            });
        });

        describe('repository', () => {

            it('returns node versions from `.travis.yml` in the repository', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', 'package.json')).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

                const result = await NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' });

                expect(fixture.stubs.listRemote.callCount).to.equal(1);
                expect(fixture.stubs.listRemote.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['14', '12', '10'],
                        resolved: {
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '14': '14.3.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('supports "owner/repo" style repository string', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', 'package.json')).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

                const result = await NodeSupport.detect({ repository: 'pkgjs/detect-node-support' });

                expect(fixture.stubs.listRemote.callCount).to.equal(1);
                expect(fixture.stubs.listRemote.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['14', '12', '10'],
                        resolved: {
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '14': '14.3.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('leaves out `travis` when no `.travis.yml` present', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', 'package.json')).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(404);

                const result = await NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' });

                expect(fixture.stubs.listRemote.callCount).to.equal(1);
                expect(fixture.stubs.listRemote.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    engines: '>=10'
                });
            });

            it('throws when loading `.travis.yml` fails', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', 'package.json')).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(500);

                const err = await expect(NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' })).to.reject();
                expect(err.name).to.equal('HttpError');
            });

            it('throws when repository does not have a package.json', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(404)
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

                await expect(NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' }))
                    .to.reject(`git+https://github.com/pkgjs/detect-node-support.git does not contain a package.json`);
            });

            it('rethrows server errors', async () => {

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(500)
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

                const err = await expect(NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/detect-node-support.git' })).to.reject();
                expect(err.name).to.equal('HttpError');
            });

            it('rethrows generic errors', async () => {

                const err = new Error('Something went wrong');

                Sinon.stub(OctokitWrapper, 'create').throws(err);

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

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com', {
                    reqheaders: {
                        'user-agent': /detect-node-support\/.* \(https:\/\/github.com\/pkgjs\/detect-node-support#readme\)/
                    }
                })
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', 'package.json')).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')));

                const result = await NodeSupport.detect({ packageName: 'detect-node-support' });

                expect(fixture.stubs.listRemote.callCount).to.equal(1);
                expect(fixture.stubs.listRemote.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['14', '12', '10'],
                        resolved: {
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '14': '14.3.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('leaves out `travis` when no `.travis.yml` present', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', 'package.json')).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(404);

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')));

                const result = await NodeSupport.detect({ packageName: 'detect-node-support' });

                expect(fixture.stubs.listRemote.callCount).to.equal(1);
                expect(fixture.stubs.listRemote.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

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

                Sinon.stub(OctokitWrapper, 'create').throws(err);

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

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', 'package.json')).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, JSON.stringify({
                        name: 'detect-node-support',
                        repository: 'git+https://github.com/pkgjs/detect-node-support.git'
                    }));

                const result = await NodeSupport.detect({ packageName: 'detect-node-support' });

                expect(fixture.stubs.listRemote.callCount).to.equal(1);
                expect(fixture.stubs.listRemote.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['14', '12', '10'],
                        resolved: {
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '14': '14.3.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('throws when repo package name does not match', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Buffer.from(JSON.stringify({ name: 'something-else' })).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

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
                        raw: ['14', '12', '10'],
                        resolved: {
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '14': '14.3.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('returns node versions from `.travis.yml` in the repository (url case)', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', 'package.json')).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

                const result = await NodeSupport.detect('git+https://github.com/pkgjs/detect-node-support.git');

                expect(fixture.stubs.listRemote.callCount).to.equal(1);
                expect(fixture.stubs.listRemote.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['14', '12', '10'],
                        resolved: {
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '14': '14.3.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('returns node versions from `.travis.yml` in the repository ("org/repo" case)', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', 'package.json')).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

                const result = await NodeSupport.detect('pkgjs/detect-node-support');

                expect(fixture.stubs.listRemote.callCount).to.equal(1);
                expect(fixture.stubs.listRemote.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['14', '12', '10'],
                        resolved: {
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '14': '14.3.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('returns node versions from `.travis.yml` in the package repository', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/pkgjs/detect-node-support/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', 'package.json')).toString('base64')
                    })
                    .get('/repos/pkgjs/detect-node-support/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

                Nock('https://registry.npmjs.org')
                    .get('/detect-node-support')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')));

                const result = await NodeSupport.detect('detect-node-support');

                expect(fixture.stubs.listRemote.callCount).to.equal(1);
                expect(fixture.stubs.listRemote.args[0]).to.equal([['http://github.com/pkgjs/detect-node-support.git', 'HEAD']]);

                expect(result).to.equal({
                    name: 'detect-node-support',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['14', '12', '10'],
                        resolved: {
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '14': '14.3.0'
                        }
                    },
                    engines: '>=10'
                });
            });

            it('returns node versions from `.travis.yml` in the package repository (scoped)', async () => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://api.github.com')
                    .get('/repos/hapijs/hapi/contents/package.json')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, 'fixtures', 'hapi-package.json')).toString('base64')
                    })
                    .get('/repos/hapijs/hapi/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')).toString('base64')
                    });

                Nock('https://registry.npmjs.org')
                    .get('/@hapi%2fhapi')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'hapi-package.json')));

                const result = await NodeSupport.detect('@hapi/hapi');

                expect(fixture.stubs.listRemote.callCount).to.equal(1);
                expect(fixture.stubs.listRemote.args[0]).to.equal([['http://github.com/hapijs/hapi.git', 'HEAD']]);

                expect(result).to.equal({
                    name: '@hapi/hapi',
                    version: '0.0.0-development',
                    commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                    timestamp: 1580673602000,
                    travis: {
                        raw: ['14', '12', '10'],
                        resolved: {
                            '10': '10.20.1',
                            '12': '12.17.0',
                            '14': '14.3.0'
                        }
                    }
                });
            });
        });

        describe('with dependencies', () => {

            beforeEach(() => {

                fixture.stubs.listRemote
                    .returns('9cef39d21ad229dea4b10295f55b0d9a83800b23\tHEAD\n');

                Nock('https://registry.npmjs.org')
                    .persist()
                    .get('/is-ci')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'packuments', 'is-ci.json')))
                    .get('/ci-info')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'packuments', 'ci-info.json')))
                    .get('/debug')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'packuments', 'debug.json')))
                    .get('/ms')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'packuments', 'ms.json')))
                    .get('/rimraf')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'packuments', 'rimraf.json')));

                Nock('https://api.github.com')
                    .get('/repos/watson/is-ci/contents/package.json')
                    .reply(200, {
                        content: Buffer.from(JSON.stringify({ name: 'is-ci', version: '2.0.0' })).toString('base64')
                    })
                    .get('/repos/watson/is-ci/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, 'fixtures', 'travis-ymls', 'testing-single-version.yml')).toString('base64')
                    })
                    .get('/repos/watson/ci-info/contents/package.json')
                    .reply(200, {
                        content: Buffer.from(JSON.stringify({ name: 'ci-info', version: '2.0.0' })).toString('base64')
                    })
                    .get('/repos/watson/ci-info/contents/.travis.yml')
                    .reply(200, {
                        content: Fs.readFileSync(Path.join(__dirname, 'fixtures', 'travis-ymls', 'testing-single-version.yml')).toString('base64')
                    })
                    .get('/repos/visionmedia/debug/contents/package.json')
                    .reply(200, {
                        content: Buffer.from(JSON.stringify({ name: 'debug', version: '4.1.1' })).toString('base64')
                    })
                    .get('/repos/visionmedia/debug/contents/.travis.yml')
                    .reply(404)
                    .get('/repos/zeit/ms/contents/package.json')
                    .reply(200, {
                        content: Buffer.from(JSON.stringify({ name: 'ms', version: '2.1.2' })).toString('base64')
                    })
                    .get('/repos/zeit/ms/contents/.travis.yml')
                    .reply(404)
                    .get('/repos/isaacs/rimraf/contents/package.json')
                    .reply(404);
            });

            it('resolves direct prod dep information', async () => {

                await fixture.setupRepoFolder({
                    packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json')).toString())
                });

                const result = await NodeSupport.detect({ path: fixture.path }, { deps: true });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: '@pkgjs/detect-node-support-deps-test',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    dependencies: {
                        versions: {
                            'ci-info': ['1.6.0'],
                            'is-ci': ['2.0.0']
                        },
                        support: [
                            {
                                name: 'ci-info',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            },
                            {
                                name: 'is-ci',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            }
                        ]
                    }
                });
            });

            it('resolves deps from shrinkwrap', async () => {

                await fixture.setupRepoFolder({
                    packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json')).toString()),
                    npmShrinkwrapJson: 'deps-test/npm-shrinkwrap.json'
                });

                const result = await NodeSupport.detect({ path: fixture.path }, { deps: true });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: '@pkgjs/detect-node-support-deps-test',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    dependencies: {
                        versions: {
                            'ci-info': ['1.6.0'],
                            'is-ci': ['2.0.0']
                        },
                        support: [
                            {
                                name: 'ci-info',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            },
                            {
                                name: 'is-ci',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            }
                        ]
                    }
                });
            });

            it('resolves deps from package-lock', async () => {

                await fixture.setupRepoFolder({
                    packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json')).toString()),
                    packageLockJson: 'deps-test/npm-shrinkwrap.json'
                });

                const result = await NodeSupport.detect({ path: fixture.path }, { deps: true });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: '@pkgjs/detect-node-support-deps-test',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    dependencies: {
                        versions: {
                            'ci-info': ['1.6.0'],
                            'is-ci': ['2.0.0']
                        },
                        support: [
                            {
                                name: 'ci-info',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            },
                            {
                                name: 'is-ci',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            }
                        ]
                    }
                });
            });

            it('resolves all deps', async () => {

                await fixture.setupRepoFolder({
                    packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json')).toString()),
                    npmShrinkwrapJson: 'deps-test/npm-shrinkwrap.json'
                });

                const result = await NodeSupport.detect({ path: fixture.path }, { deps: true, deep: true, dev: true });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: '@pkgjs/detect-node-support-deps-test',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    dependencies: {
                        versions: {
                            'ci-info': ['1.6.0', '2.0.0'],
                            'is-ci': ['2.0.0'],
                            debug: ['4.1.1'],
                            ms: ['2.1.2']
                        },
                        support: [
                            {
                                name: 'ci-info',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            },
                            {
                                name: 'debug',
                                version: '4.1.1',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23'
                            },
                            {
                                name: 'is-ci',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            },
                            {
                                name: 'ms',
                                version: '2.1.2',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23'
                            }
                        ]
                    }
                });
            });

            it('resolves direct deps', async () => {

                await fixture.setupRepoFolder({
                    packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json')).toString()),
                    npmShrinkwrapJson: 'deps-test/npm-shrinkwrap.json'
                });

                const result = await NodeSupport.detect({ path: fixture.path }, { deps: true, dev: true });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: '@pkgjs/detect-node-support-deps-test',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    dependencies: {
                        versions: {
                            'ci-info': ['1.6.0'],
                            'is-ci': ['2.0.0'],
                            debug: ['4.1.1']
                        },
                        support: [
                            {
                                name: 'ci-info',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            },
                            {
                                name: 'debug',
                                version: '4.1.1',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23'
                            },
                            {
                                name: 'is-ci',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            }
                        ]
                    }
                });
            });

            it('resolves all prod deps', async () => {

                await fixture.setupRepoFolder({
                    packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json')).toString()),
                    npmShrinkwrapJson: 'deps-test/npm-shrinkwrap.json'
                });

                const result = await NodeSupport.detect({ path: fixture.path }, { deps: true, deep: true });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: '@pkgjs/detect-node-support-deps-test',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    dependencies: {
                        versions: {
                            'ci-info': ['1.6.0', '2.0.0'],
                            'is-ci': ['2.0.0']
                        },
                        support: [
                            {
                                name: 'ci-info',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            },
                            {
                                name: 'is-ci',
                                version: '2.0.0',
                                timestamp: 1580673602000,
                                commit: '9cef39d21ad229dea4b10295f55b0d9a83800b23',
                                travis: {
                                    raw: ['10'],
                                    resolved: { '10': '10.20.1' }
                                }
                            }
                        ]
                    }
                });
            });

            it('rethrows lock file parsing errors', async () => {

                await fixture.setupRepoFolder({
                    packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json')).toString()),
                    packageLockJson: 'travis-ymls/testing-single-version.yml' // not a json file
                });

                await expect(NodeSupport.detect({ path: fixture.path }, { deps: true })).to.reject('Unexpected token l in JSON at position 0');
            });

            it('handles failures to load packages', async () => {

                Sinon.stub(console, 'warn');

                await fixture.setupRepoFolder({
                    packageJson: {
                        name: '@pkgjs/detect-node-support-deps-test',
                        version: '0.0.0-development',
                        dependencies: {
                            rimraf: '1.x'
                        }
                    }
                });

                const result = await NodeSupport.detect({ path: fixture.path }, { deps: true });

                internals.assertCommit(result);

                expect(result).to.equal({
                    name: '@pkgjs/detect-node-support-deps-test',
                    version: '0.0.0-development',
                    timestamp: 1580673602000,
                    dependencies: {
                        support: [],
                        versions: {
                            rimraf: ['1.0.9']
                        },
                        errors: {
                            rimraf: {
                                message: 'git://github.com/isaacs/rimraf.git does not contain a package.json'
                            }
                        }
                    }
                });
            });
        });
    });
});
