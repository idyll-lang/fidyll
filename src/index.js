

// This is the main gridyll file

// The tasks will be:
// 1. Parse the input file
// 2. Determine output targets
// 3. For each output target:
//    3.1. Serialize Idyll markup
//    3.2. Determine grid structure
//    3.3. Define grid placement for graphics, notes, text
//    3.4. Do any necessary post processing (e.g. record video, composite static images)
// 4. Generate routing logic when necessary (e.g. to support personalization, mobile, etc)
// 5. Create final ouput


// Boilerplate
const fs = require('fs-extra');
const path = require('path');

const util = require('util');
const textToSpeech = require('@google-cloud/text-to-speech');

const { exec, spawn } = require('child_process');

const parseGridyllInput = require('./parse/parse-aml');
const serializeIdyll = require('./serialize-idyll');

// Class implementation

class Gridyll {
    constructor(options) {
        if (!options || !options.components || !options.input) {
            throw new Error('Missing options in Gridyll constructor');
        }

        this.inputPath = options.input;
        this.componentsPath = options.components;

        this.projectPath = path.dirname(this.inputPath);

        // 1. parse the input file
        const { content, header } = this.parseInput();

        // 2. Determine the output targets
        const targets = header.targets;

        console.log('Ensuring that output target boilerplate exists...');
        this.ensureTargetsExist(targets);

        let videoPort = 3000;

        // 3. For each target
        targets.forEach((target, i) => {
            const { targets, ...idyllHeader } = header;

            console.log(`Serializing markup for target ${target}`);


            //    3.1. Serialize Idyll markup
            const outputText = serializeIdyll(target, idyllHeader, content);
            
            const idyllPath = path.join(this.projectPath, 'output', target, 'index.idyll');
            const idyllOutputPath = path.join(this.projectPath, 'output', target);
            const componentsOutputPath = path.join(this.projectPath, 'output', target, 'components');
            const dataOutputPath = path.join(this.projectPath, 'output', target, 'data');
            const dataInputPath = path.join(this.projectPath, 'data');
            const staticOutputPath = path.join(this.projectPath, 'output', target, 'static');
            const staticInputPath = path.join(this.projectPath, 'static');
            
            
            fs.writeFileSync(idyllPath, outputText);
            console.log(`Serialization complete.\n`)

            if (target === 'video') {
                videoPort = 3000 + i;
            }

            // console.log(`Executing for target ${target}`, `\n\tcd ${idyllOutputPath} && idyll --port ${3000 + i}`)

            
            //    3.2. Determine grid structure

            // TODO 
            //      - Determine separately for each breakpoint
            //      - Determine separately for each section
            //          - maybe... associate constraints with each template?
            const stylesPath = path.join(this.projectPath, 'output', target, 'styles.css');
            const templateOptions = fs.readdirSync(path.join(__dirname, 'grid-templates', target)).filter(f => !['.ds_store'].includes(f.toLowerCase()));
            
            let chosenTemplate;
            if (!templateOptions.length) {
                console.warn(`Warning: No templates available for target ${target}... continuing without.`);
            }
            else if (templateOptions.length === 1) {
                chosenTemplate = templateOptions[0];
            } else {
                console.warn(`Warning: Found multiple potential templates for target ${target}, but have no logic to decide... taking the first one.`);                
                chosenTemplate = templateOptions[0];
            }

            fs.copyFileSync(path.join(__dirname, 'grid-templates', target, chosenTemplate), path.join(idyllOutputPath, 'styles.css'));


            //    3.3. Define grid placement for text, graphics, notes


            //      TODO: 
            //          1. For each breakpoint in the template:
            //              1.1. Place any elements for which there is no free dimension ()
            //              1.2. Launch pupeteer with page 
            //              1.3. F



            // copy data and components
            fs.copySync(this.componentsPath, componentsOutputPath);
            fs.copySync(dataInputPath, dataOutputPath);
            fs.copySync(staticInputPath, staticOutputPath);

            const _idyll = spawn(`cd ${idyllOutputPath} && idyll --compileLibs=true --ssr=false --port ${3000 + i}`, {
                shell: true
            });

            _idyll.stderr.on('data', (data) => {
                console.log(data.toString());
            })
            _idyll.stdout.on('data', (data) => {
                if (target === 'video' && data.includes('Serving files from:')) {
                    console.log('\n🎬 Recording video...');
                    const puppeteer = require('puppeteer');
                    const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
                
                    (async () => {
                        const browser = await puppeteer.launch({
                            defaultViewport: { width: 1280 * 2, height: 720 * 2 }
                        });
                        const page = await browser.newPage();
                        const recorder = new PuppeteerScreenRecorder(page, {
                            ffmpeg_Path: '/opt/homebrew/bin/ffmpeg',
                            videoFrame: {
                                width: 1280 * 2,
                                height: 720 * 2,
                            },
                            aspectRatio: '16:9',
                        });
                        console.log('video port', videoPort)
                        await recorder.start('video.mp4'); // video must have .mp4 has an extension.
                        await page.goto(`http://localhost:${videoPort}`);
                        await page.waitForTimeout(12000);
                        await recorder.stop();
                        await browser.close();
                        console.log('🎬 Recording complete.\n');
                        
                        const client = new textToSpeech.TextToSpeechClient();
                        const text = 'hello, world!';

                        // Construct the request
                        const request = {
                            input: {text: text},
                            // Select the language and SSML voice gender (optional)
                            voice: {languageCode: 'en-US', ssmlGender: 'NEUTRAL'},
                            // select the type of audio encoding
                            audioConfig: {audioEncoding: 'MP3'},
                        };

                        // Performs the text-to-speech request
                        const [response] = await client.synthesizeSpeech(request);
                        // Write the binary audio content to a local file
                        const writeFile = util.promisify(fs.writeFile);
                        await writeFile('output.mp3', response.audioContent, 'binary');
                        console.log('Audio content written to file: output.mp3');

                    })();               
                }
            });


            //    3.4. Do any necessary post processing (e.g. record video, composite static images)

            // generating static images

        })

    }

    ensureTargetsExist(targets) {
        targets.forEach((target) => {
            console.log('target', target);
            if (!fs.pathExistsSync(path.join(this.projectPath, 'output', target))) {
                console.log(`\tCreating target '${target}' at path ${path.join(this.projectPath, 'output', target)}`);
                fs.copySync(path.join(__dirname, 'output', target), path.join(this.projectPath, 'output', target));
            }
        })
    }

    parseInput() {
        // 1. Parse the input file
        const text = fs.readFileSync(this.inputPath, 'utf-8');
        return parseGridyllInput(text);
    }

    serializeTarget() {

    }

    serializeAllTargets() {

    }

    

}



module.exports = Gridyll;