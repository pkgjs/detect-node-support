'use strict';

const NodeSupport = require('..');

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

});
