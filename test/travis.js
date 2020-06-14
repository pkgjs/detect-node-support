'use strict';

const Fs = require('fs');
const Nock = require('nock');
const Path = require('path');

const NodeSupport = require('..');
const TravisMerge = require('../lib/travis/merge');

const TestContext = require('./fixtures');


const { describe, it, beforeEach, afterEach } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');


const internals = {};


internals.assertCommit = (result) => {

    expect(result.commit).to.match(/^[0-9a-f]{40}$/);
    delete result.commit;
};


describe('.travis.yml parsing', () => {

    let fixture;

    beforeEach(() => {

        fixture = new TestContext();
    });

    afterEach(() => {

        fixture.cleanup();
    });

    for (const yml of ['simple-single-object', 'simple-single-string', 'simple-array-object', 'simple-array-string']) {

        // eslint-disable-next-line no-loop-func
        it(`resolves simple local import (${yml})`, async () => {

            await fixture.setupRepoFolder({
                partials: true,
                travisYml: `testing-imports/${yml}.yml`
            });

            const result = await NodeSupport.detect({ path: fixture.path });

            internals.assertCommit(result);

            expect(result).to.equal({
                name: 'test-module',
                version: '0.0.0-development',
                timestamp: 1580673602000,
                travis: {
                    raw: ['14'],
                    resolved: { '14': '14.3.0' }
                }
            });
        });
    }

    it('resolves indirect imports', async () => {

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/indirect.yml`
        });

        const result = await NodeSupport.detect({ path: fixture.path });

        internals.assertCommit(result);

        expect(result).to.equal({
            name: 'test-module',
            version: '0.0.0-development',
            timestamp: 1580673602000,
            travis: {
                raw: ['14'],
                resolved: { '14': '14.3.0' }
            }
        });
    });

    it('resolves indirect imports (./)', async () => {

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/indirect-dot-slash.yml`
        });

        const result = await NodeSupport.detect({ path: fixture.path });

        internals.assertCommit(result);

        expect(result).to.equal({
            name: 'test-module',
            version: '0.0.0-development',
            timestamp: 1580673602000,
            travis: {
                raw: ['14'],
                resolved: { '14': '14.3.0' }
            }
        });
    });

    it('ignores conditional imports', async () => {

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/conditional.yml`
        });

        const result = await NodeSupport.detect({ path: fixture.path });

        internals.assertCommit(result);

        expect(result).to.equal({
            name: 'test-module',
            version: '0.0.0-development',
            timestamp: 1580673602000,
            travis: {
                raw: ['latest'],
                resolved: { 'latest': '13.14.0' }
            }
        });
    });

    it('resolves from another repo', async () => {

        Nock('https://raw.githubusercontent.com')
            .get('/pkgjs/detect-node-support/HEAD/test/fixtures/travis-ymls/testing-imports/partials/indirect-node-14.yml')
            .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'travis-ymls', 'testing-imports', 'partials', 'indirect-node-14.yml')))
            .get('/pkgjs/detect-node-support/HEAD/test/fixtures/travis-ymls/testing-imports/partials/node-14.yml')
            .reply(200, Fs.readFileSync(Path.join(__dirname, 'fixtures', 'travis-ymls', 'testing-imports', 'partials', 'node-14.yml')));

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/another-repo.yml`
        });

        const result = await NodeSupport.detect({ path: fixture.path });

        internals.assertCommit(result);

        expect(result).to.equal({
            name: 'test-module',
            version: '0.0.0-development',
            timestamp: 1580673602000,
            travis: {
                raw: ['14'],
                resolved: { '14': '14.3.0' }
            }
        });
    });

    it('resolves and merges (prepend/append)', async () => {

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/merge-deep-prepend-append.yml`
        });

        const result = await NodeSupport.detect({ path: fixture.path });

        internals.assertCommit(result);

        expect(result).to.equal({
            name: 'test-module',
            version: '0.0.0-development',
            timestamp: 1580673602000,
            travis: {
                raw: ['12', '8', '14', '10.15', '10.16'],
                resolved: {
                    '8': '8.17.0',
                    '10.15': '10.15.3',
                    '10.16': '10.16.3',
                    '12': '12.17.0',
                    '14': '14.3.0'
                }
            }
        });
    });

    it('resolves and merges (deep)', async () => {

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/merge-deep.yml`
        });

        const result = await NodeSupport.detect({ path: fixture.path });

        internals.assertCommit(result);

        expect(result).to.equal({
            name: 'test-module',
            version: '0.0.0-development',
            timestamp: 1580673602000,
            travis: {
                raw: ['12'],
                resolved: {
                    '12': '12.17.0'
                }
            }
        });
    });

    it('resolves and merges (shallow)', async () => {

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/merge-shallow.yml`
        });

        const result = await NodeSupport.detect({ path: fixture.path });

        internals.assertCommit(result);

        expect(result).to.equal({
            name: 'test-module',
            version: '0.0.0-development',
            timestamp: 1580673602000,
            travis: {
                raw: ['12'],
                resolved: {
                    '12': '12.17.0'
                }
            }
        });
    });

    it('throws on invalid merge mode', async () => {

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/partials/merge-invalid.yml`
        });

        await expect(NodeSupport.detect({ path: fixture.path })).to.reject('Invalid merge mode for partials/node-12.yml in .travis.yml: no_such_merge_mode');
    });

    it('throws on invalid merge mode (indirect)', async () => {

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/merge-invalid.yml`
        });

        await expect(NodeSupport.detect({ path: fixture.path })).to.reject('Invalid merge mode for partials/node-12.yml in partials/merge-invalid.yml: no_such_merge_mode');
    });

    it('throws when importing at commitish', async () => {

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/partials/commitish.yml`
        });

        await expect(NodeSupport.detect({ path: fixture.path })).to.reject('Importing at commitish unsupported in .travis.yml: partials/node-14.yml@main');
    });

    it('throws when importing at commitish (indirect)', async () => {

        await fixture.setupRepoFolder({
            partials: true,
            travisYml: `testing-imports/commitish.yml`
        });

        await expect(NodeSupport.detect({ path: fixture.path })).to.reject('Importing at commitish unsupported in partials/commitish.yml: partials/node-14.yml@main');
    });
});

describe('Travis merging algorithms', () => {

    let left;
    let right;

    beforeEach(() => {

        left = {
            str1: 'left',
            str2: 'left',
            arr: ['left'],
            obj: {
                left: true,
                arr: ['left'],
                deep: {
                    left: true,
                    arr: ['left']
                }
            },
            mix1: ['left'],
            mix2: { left: true }
        };

        right = {
            str1: 'right',
            str3: 'right',
            arr: ['right'],
            obj: {
                right: true,
                arr: ['right'],
                deep: {
                    right: true,
                    arr: ['right']
                }
            },
            mix1: { right: true },
            mix2: ['right']
        };
    });

    it('deep_merge_append', () => {

        TravisMerge.deep_merge_append(left, right);

        expect(left).to.equal({
            str1: 'right',
            str2: 'left',
            str3: 'right',
            arr: ['left', 'right'],
            obj: {
                left: true,
                right: true,
                arr: ['left', 'right'],
                deep: {
                    left: true,
                    right: true,
                    arr: ['left', 'right']
                }
            },
            mix1: { right: true },
            mix2: ['right']
        });
    });

    it('deep_merge_prepend', () => {

        TravisMerge.deep_merge_prepend(left, right);

        expect(left).to.equal({
            str1: 'right',
            str2: 'left',
            str3: 'right',
            arr: ['right', 'left'],
            obj: {
                left: true,
                right: true,
                arr: ['right', 'left'],
                deep: {
                    left: true,
                    right: true,
                    arr: ['right', 'left']
                }
            },
            mix1: { right: true },
            mix2: ['right']
        });
    });

    it('deep_merge', () => {

        TravisMerge.deep_merge(left, right);

        expect(left).to.equal({
            str1: 'right',
            str2: 'left',
            str3: 'right',
            arr: ['right'],
            obj: {
                left: true,
                right: true,
                arr: ['right'],
                deep: {
                    left: true,
                    right: true,
                    arr: ['right']
                }
            },
            mix1: { right: true },
            mix2: ['right']
        });
    });

    it('merge', () => {

        TravisMerge.merge(left, right);

        expect(left).to.equal({
            str1: 'right',
            str2: 'left',
            str3: 'right',
            arr: ['right'],
            obj: {
                right: true,
                arr: ['right'],
                deep: {
                    right: true,
                    arr: ['right']
                }
            },
            mix1: { right: true },
            mix2: ['right']
        });
    });
});
