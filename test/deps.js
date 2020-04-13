'use strict';

const Fs = require('fs');
const Path = require('path');

const Deps = require('../lib/deps');


const { describe, it } = exports.lab = require('@hapi/lab').script();
const { expect } = require('@hapi/code');

describe('Deps', () => {

    describe('resolve', () => {

        it('returns flattened list of direct prod deps', async () => {

            const result = await Deps.resolve({
                packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json'))),
                lockfile: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'npm-shrinkwrap.json')))
            }, {});

            expect(result).to.equal({
                'ci-info': ['1.6.0'],
                'is-ci': ['2.0.0']
            });
        });

        it('returns flattened list of all deps', async () => {

            const result = await Deps.resolve({
                packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json'))),
                lockfile: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'npm-shrinkwrap.json')))
            }, { deep: true, dev: true });

            expect(result).to.equal({
                'ci-info': ['1.6.0', '2.0.0'],
                'is-ci': ['2.0.0'],
                'ms': ['2.1.2']
            });
        });

        it('returns flattened list of deps (only direct)', async () => {

            const result = await Deps.resolve({
                packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json'))),
                lockfile: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'npm-shrinkwrap.json')))
            }, { dev: true });

            expect(result).to.equal({
                'ci-info': ['1.6.0'],
                'is-ci': ['2.0.0'],
                'ms': ['2.1.2']
            });
        });

        it('returns flattened list of deps (only prod)', async () => {

            const result = await Deps.resolve({
                packageJson: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'package.json'))),
                lockfile: JSON.parse(Fs.readFileSync(Path.join(__dirname, 'fixtures', 'deps-test', 'npm-shrinkwrap.json')))
            }, { deep: true });

            expect(result).to.equal({
                'ci-info': ['1.6.0', '2.0.0'],
                'is-ci': ['2.0.0']
            });
        });
    });
});
