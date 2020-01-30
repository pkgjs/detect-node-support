'use strict';

const Fs = require('fs');
const Nock = require('nock');
const Path = require('path');
const Tmp = require('tmp');

const NodeSupport = require('..');


const { describe, it, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');


const internals = {
    tmpObjects: []
};

internals.prepareFixture = (travisYml) => {

    const tmpObj = Tmp.dirSync({ unsafeCleanup: true });

    internals.tmpObjects.push(tmpObj);

    if (travisYml) {
        Fs.copyFileSync(Path.join(__dirname, 'fixtures', travisYml), Path.join(tmpObj.name, '.travis.yml'));
    }

    Fs.writeFileSync(Path.join(tmpObj.name, 'package.json'), JSON.stringify({
        name: 'test-module',
        version: '0.0.0-development'
    }));

    return tmpObj.name;
};


describe('node-support', () => {

    afterEach(() => {

        internals.tmpObjects.forEach((tmpObj) => {

            tmpObj.removeCallback();
        });

        internals.tmpObjects = [];
    });

    describe('detect()', () => {

        describe('path', () => {

            it('returns node versions from `.travis.yml` at the path', async () => {

                const path = Path.join(__dirname, '..');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'node-support',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['10', '12', '13']
                    }
                });
            });

            it('leaves out `travis` when no `.travis.yml` present', async () => {

                const path = internals.prepareFixture();

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development'
                });
            });

            it('returns the single node version', async () => {

                const path = internals.prepareFixture('_single-version.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['10']
                    }
                });
            });

            it('returns default node version', async () => {

                const path = internals.prepareFixture('_minimal.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['latest']
                    }
                });
            });

            it('returns empty array when no node detected', async () => {

                const path = internals.prepareFixture('_no-node.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: []
                    }
                });
            });

            it('returns node versions from matrix env vars (NODEJS_VER)', async () => {

                const path = internals.prepareFixture('kangax-html-minifier.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['6', '8', '10', 'latest']
                    }
                });
            });

            it('returns node versions from matrix env vars (TRAVIS_NODE_VERSION)', async () => {

                const path = internals.prepareFixture('nodejs-nan.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['0.10', '0.12', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'lts/*']
                    }
                });
            });

            it('returns node versions from matrix env vars (NODE_VER)', async () => {

                const path = internals.prepareFixture('reactivex-rxjs.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['4', '6', '7']
                    }
                });
            });

            it('handles non-matching matrix env vars', async () => {

                const path = internals.prepareFixture('caolan-async.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['8', '10', '12']
                    }
                });
            });

            it('returns node versions from matrix include', async () => {

                const path = internals.prepareFixture('nodejs-readable-stream.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['6', '8', '9', '10', '12', 'stable']
                    }
                });
            });

            it('handles single matrix include', async () => {

                const path = internals.prepareFixture('postcss-autoprefixer.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['node', '10', '12', '8', '6']
                    }
                });
            });

            it('handles matrix includes without node versions', async () => {

                const path = internals.prepareFixture('shinn-is-resolvable.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['node']
                    }
                });
            });

            it('handles missing env.matrix', async () => {

                const path = internals.prepareFixture('_no-env-matrix.yml');

                const result = await NodeSupport.detect({ path });

                expect(result).to.equal({
                    name: 'test-module',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['latest']
                    }
                });
            });
        });


        describe('repository', () => {

            beforeEach(() => {

                if (!Nock.isActive()) {
                    Nock.activate();
                }
            });

            afterEach(() => {

                Nock.restore();
                Nock.cleanAll();
            });

            it('returns node versions from `.travis.yml` in the repository', async () => {

                Nock('https://raw.githubusercontent.com')
                    .get('/pkgjs/node-support/HEAD/package.json')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', 'package.json')))
                    .get('/pkgjs/node-support/HEAD/.travis.yml')
                    .reply(200, Fs.readFileSync(Path.join(__dirname, '..', '.travis.yml')));

                const result = await NodeSupport.detect({ repository: 'git+https://github.com/pkgjs/node-support.git' });

                expect(result).to.equal({
                    name: 'node-support',
                    version: '0.0.0-development',
                    travis: {
                        raw: ['10', '12', '13']
                    }
                });
            });

            it('throws when a package does not live on public github.com', async () => {

                await expect(NodeSupport.detect({ repository: 'git+https://github.example.com/pkgjs/node-support.git' }))
                    .to.reject('Only github.com paths supported, feel free to PR at https://github.com/pkgjs/node-support');
            });
        });
    });
});
