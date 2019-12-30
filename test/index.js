'use strict';

const Fs = require('fs');
const Path = require('path');
const Tmp = require('tmp');

const NodeSupport = require('..');


const { describe, it, afterEach } = exports.lab = require('@hapi/lab').script();
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
    });
});
