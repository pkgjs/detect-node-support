'use strict';

const Fs = require('fs');
const Path = require('path');

const Deps = require('../lib/deps');


const { describe, it } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

describe('Deps', () => {

    describe('resolve', () => {

        it('returns flattened list of deps', async () => {

            const result = await Deps.resolve({
                packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test-package.json'))),
                lockfile: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test-lock.json')))
            });

            expect(result).to.equal({
                'ci-info': ['1.6.0', '2.0.0'],
                'is-ci': ['2.0.0']
            });
        });
    });
});
