
const fs = require('fs');
const path = require('path');
const archieml = require('archieml');
const matter = require('gray-matter');
const yaml = require('js-yaml');


const preprocess = (text) => {
    text = text.replace(/\:([^\s\n])/g, ': $1')
    return text.trim();
}

const flexibleParseYaml = (text) => {
    // console.log('---------\nparsing yml\n---------\n', text, '\n\n');
    return yaml.load(text);
}

let text = fs.readFileSync(path.join(__dirname, '..', 'examples', 'basic-test.aml'), 'utf-8');

text = preprocess(text);

const { content, data: header } = matter(text);

const states = {
    PRE_SCENE: 'PRE_SCENE',
    SCENE_YML: 'SCENE_YML',
    PRE_STAGE: 'PRE_STAGE',
    STAGE_YML: 'STAGE_YML',
    STAGE: 'STAGE'
}

let currentState = states.PRE_SCENE;

let parsedContent = [];
let currentContent = null;
let currentScene = null;

content.split('\n').forEach((line) => {
    // console.log(currentState, line);
    switch(currentState) {
        case states.PRE_SCENE:
            if (line.trim().match(/\s*{scene}/g)) { // starting the first scene
                if (currentContent) {
                    parsedContent.push(currentContent);
                    currentContent = null;
                }
                currentState = states.SCENE_YML;
                break;
            } else if (line.trim()) { // text before any scenes declared
                if (!currentContent) {
                    currentContent = {
                        type: 'text',
                        text: ''
                    }
                }
                currentContent.text += '\n' + line 
            }
            break;
        case states.SCENE_YML: 
            if (!line.trim() || line.trim() === '{}') { // empty line, the yaml is over

                if (!currentContent) {
                    throw new Error('Scene declared with no information.');
                }                

                try {
                    currentContent.parsed = flexibleParseYaml(currentContent.raw);
                } catch(e) {
                    console.log('Error parscing scene YAML', e);
                }
                currentState = states.PRE_STAGE;
            } else { // this is the yaml
                if (!currentContent) {
                    currentContent = {
                        type: 'scene',
                        text: '',
                        raw: '',
                        foreward: '',
                        stages: []
                    }
                    currentScene = currentContent;
                }
                currentContent.raw += '\n' + line;
            }
            break;
        case states.PRE_STAGE:
            if (line.trim().match(/\s*{stage}/g)) { // starting the first stage
                parsedContent.push(currentContent);
                currentContent = null;
                currentState = states.STAGE_YML;
            } else if (line.trim()) {
                currentContent.foreward += '\n' + line;
            }
            break;
        case states.STAGE_YML:
            if (!line.trim() || line.trim() === '{}') { // empty line, the yaml is over
                if (!currentContent) {
                    throw new Error('Stage declared with no information.');
                }                

                try {
                    currentContent.parsed = flexibleParseYaml(currentContent.raw);
                } catch(e) {
                    console.log('Error parsing stage YAML', e);
                }
                currentState = states.STAGE;
            } else { // this is the yaml
                if (!currentContent) {
                    currentContent = {
                        type: 'stage',
                        text: '',
                        raw: ''
                    }
                }
                currentContent.raw += '\n' + line;
            }
            break;

        case states.STAGE:
            if (line.trim().match(/\s*{stage}/g)) { // starting a new stage
                currentScene.stages.push(currentContent);
                currentContent = null;
                currentState = states.STAGE_YML;
            } else if (line.trim().match(/\s*{scene}/g)) { // starting a new scene
                currentScene.stages.push(currentContent);
                currentContent = null;
                currentState = states.SCENE_YML;
            } else {
                currentContent.text += '\n' + line;
            }
            break;
    }
})

if (currentContent) {
    console.log('adding one at the end');
    if (currentContent.type === 'stage') {
        currentScene.stages.push(currentContent);
    } else {
        parsedContent.push(currentContent);
    }
}

// console.log('parsedContent', JSON.stringify(parsedContent, null, 2));


const serializeIdyll = require('./serialize-idyll');
const Idyll = require('idyll');

const targets = header.targets;

// const targets = [{
// //     name: 'scroller',
// //     output: 'scroller'
// // }, {
//     name: 'slideshow',
//     output: 'slides'
// }];

console.log(header, targets)
targets.forEach((target, i) => {
    // console.log(target)
    const { targets, ...idyllHeader } = header;
    const outputText = serializeIdyll(target, idyllHeader, parsedContent);

    const idyllPath = path.join(__dirname, '..', 'output', target, 'index.idyll');
    const idyllOutputPath = path.join(__dirname, '..', 'output', target, 'build');
    
    console.log("idyll path", idyllPath)
    console.log("text output path", idyllPath)
    console.log("output path", idyllOutputPath)

    fs.writeFileSync(idyllPath, outputText);
    // if (i === 0) {
        const idyll = Idyll({
            inputFile: idyllPath,
            output: idyllOutputPath,
            watch: true,
            css: path.join(path.dirname(idyllPath), 'styles.css'),
            port: 3000 + i
          });
          
          idyll.build({ live: true })
               .on('update', () => {}) // the compilation finished.
               .on('error', (e) => {
                   console.warn(e)
               }) // there was an error
    // }
})






