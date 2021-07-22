
const fs = require('fs');
const path = require('path');
const archieml = require('archieml');
const matter = require('gray-matter');
const yaml = require('js-yaml');
const Idyll = require('idyll');
const { exec } = require('child_process');

const serializeIdyll = require('./serialize-idyll');

const preprocess = (text) => {
    text = text.replace(/\:([^\s\n])/g, ': $1')
    return text.trim();
}

const flexibleParseYaml = (text) => {
    // console.log('---------\nparsing yml\n---------\n', text, '\n\n');
    return yaml.load(text);
}

const _args = process.argv.slice(2);

let text;

if (_args.length) {
    text = fs.readFileSync(_args[0], 'utf-8');
} else {
    text = fs.readFileSync(path.join(__dirname, '..', 'examples', 'basic-test.aml'), 'utf-8');
}


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



const targets = header.targets;

// const targets = [{
// //     name: 'scroller',
// //     output: 'scroller'
// // }, {
//     name: 'slideshow',
//     output: 'slides'
// }];

let videoPort = 3000;

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

    if (target === 'video') {
        videoPort = 3000 + i;
    }

    console.log('executing', `cd ${path.join(__dirname, '..', 'output', target)} && idyll --port ${3000 + i}`)

    exec(`cd ${path.join(__dirname, '..', 'output', target)} && idyll --port ${3000 + i}`, function(err, stdout, stderr){
        console.log(stdout);
        console.log(stderr);
    });
    // if (i === 0) {
    // const idyll = Idyll({
    //     inputFile: idyllPath,
    //     output: idyllOutputPath,
    //     watch: true,
    //     css: path.join(path.dirname(idyllPath), 'styles.css'),
    //     port: 3000 + i
    //     });

    // idyll.build({ live: true })
    //     .on('update', () => {}) // the compilation finished.
    //     .on('error', (e) => {
    //         console.warn(e)
    //     }) // there was an error
})


console.log(targets);

if (targets.includes('video')) {

    setTimeout(() => {
        console.log('Recording video');
        const puppeteer = require('puppeteer');
        const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
    
        console.log('recording 1');
        (async () => {
            console.log('recording 2');
            const browser = await puppeteer.launch();
            console.log('recording 3');
            const page = await browser.newPage();
            console.log('recording 4');
            const recorder = new PuppeteerScreenRecorder(page, {
                ffmpeg_Path: '/opt/homebrew/bin/ffmpeg',
                videoFrame: {
                    width: 1280,
                    height: 720,
                },
                aspectRatio: '16:9',
            });
            console.log('recording 5');
            await recorder.start(path.join(__dirname, '..', 'video.mp4')); // video must have .mp4 has an extension.
            console.log('recording 6');
            await page.goto(`http://localhost:${videoPort}`);
            console.log('recording 7');
            await page.waitForTimeout(3000);
            console.log('recording 8');
            await recorder.stop();
            console.log('recording 9');
            await browser.close();
            console.log('recording 10');
        })();

    }, 5000)
}


