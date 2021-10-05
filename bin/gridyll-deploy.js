#! /usr/bin/env node

// TODO---

// look at all the folders in the output folder
// generate an index.html that covers all of the outputs


const path = require('path');
const fs = require('fs-extra');

const _args = process.argv.slice(2);
const builtPath = path.resolve(_args[0]);

const directories =  fs.readdirSync(builtPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)


const files =  fs.readdirSync(builtPath, { withFileTypes: true })
.filter(dirent => !dirent.isDirectory())
.map(dirent => dirent.name)


let metadata = {}
try {
  metadata = require(path.resolve(path.join(path.resolve(_args[0]), '..', 'metadata.json')));
} catch(e) {
  console.warn('Could not find metadata');
}
console.log('directories', directories);

const outputHTML = `
<!doctype html>
<html class="no-js" lang="">

  <head>
    <meta charset="utf-8">
    <title>${metadata.title}</title>
    <meta name="description" content="">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <meta property="og:title" content="${metadata.title}">
    <meta property="og:type" content="article">

    <style>
      a.article-link {
        display: block;
        border: solid 1px #666;
        width: 250px;
        text-align: center;
        background: #ffffff;
        padding: 0.5em 0.25em;
        transition: background 0.25s;
        color: #666;
        font-size: 16px;
        font-family: sans-serif;
        margin: 0.5em auto;
        text-decoration: none;
        cursor: pointer;
      }

      a.article-link:hover {
        background: #efefef;
      }

      p {
        width: 350px;
        font-size: 16px;
        line-height: 1.3;
        font-family: sans-serif;
        font-weight: 400;
      }
    </style>

  </head>

  <body>
    <div style='display:flex; position:absolute; top:0; bottom:0; right:0; left:0;'>
      <div  style='margin:auto;'>
          ${metadata.title ?
            `<div style="margin-bottom: 2em;">
              <p>
                ${metadata.title} is a cross-platform interactive article created with <a href="">Gridyll</a>. Choose your
                experience below.
              </p>
            </div>`
             : ''}
          ${directories.includes('scroller') ?
            `<a class="article-link" href="./scroller/">Interactive Article</a>`
          : ''}
          ${directories.includes('presentation') ?
            `<a class="article-link" href="./presentation/?live=false">Interactive Slideshow</a>`
          : ''}
          ${directories.includes('static') ?
            `<a class="article-link" href="./static-html/">Low-motion HTML</a>`
          : ''}
          ${files.includes('static-output.pdf') ?
            `<a class="article-link" href="./static-output.pdf">PDF</a>`
          : ''}

          ${directories.includes('presentation') ?
          `<div style="margin-top: 2em;">
            <a class="article-link" onclick="var roomcode = prompt('Enter room code'); roomcode ? window.location = ('./presentation/?live=true&room=' + roomcode) : null">
              Join live presentation
            </a>
            <a class="article-link" onclick="var presentroomcode = prompt('Enter room code'); presentroomcode ? window.open('./presentation/?live=true&presenting=true&room=' + presentroomcode) : null; presentroomcode ? window.location = ('./presentation/?live=true&room=' + presentroomcode) : null">
              Start live presentation
            </a>
          </div>`
        : ''
        }
      </div>
    </div>
  </body>

</html>
`

const deploypath = path.join(path.resolve(_args[0]), '..', 'deploy')

fs.ensureDirSync(deploypath);
fs.writeFileSync(path.join(deploypath, 'index.html'), outputHTML);


console.log('Copying over built articles...');


const nameMap = {
  'static': 'static-html'
}

fs.readdirSync(builtPath, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .forEach((dirent) => {
    if (nameMap[dirent.name]) {
      fs.copySync(path.join(builtPath, dirent.name, 'build'), path.join(deploypath, nameMap[dirent.name]));
    } else {
      fs.copySync(path.join(builtPath, dirent.name, 'build'), path.join(deploypath, dirent.name));
    }
  });


files.includes('static-output.pdf') ? fs.copyFileSync(path.join(builtPath, 'static-output.pdf'), path.join(deploypath, 'static-output.pdf')) : null;