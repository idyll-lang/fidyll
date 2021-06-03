const archieml = require('archieml');
const fs = require('fs');
const path = require('path');

let text = fs.readFileSync(path.join(__dirname, '..', 'examples', 'take-2.aml'), 'utf-8');



const parsed = archieml.load(text);

console.log(parsed)
