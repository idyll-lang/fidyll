#! /usr/bin/env node

const updateNotifier = require('update-notifier');
const pkg = require('../package.json');

updateNotifier({ pkg }).notify();

const path = require('path');
const fs = require('fs');


const _args = process.argv.slice(2);


console.log('\n🥞 Hot off the Gridyll!\n');

const Gridyll = require('..');

new Gridyll({
  input: path.resolve(_args[0]),
  components: path.join(path.dirname(path.resolve(_args[0])), 'components')
})

