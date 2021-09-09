

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
const editly = require('editly');

const { exec, spawn } = require('child_process');

const parseGridyllInput = require('./parse/parse-aml');
const serializeIdyll = require('./serialize-idyll');
const getVideoAudioData = require('./get-video-audio-data');

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
        const { targets, ...idyllHeader } = header;

        console.log('Ensuring that output target boilerplate exists...');
        this.ensureTargetsExist(targets);

        let videoPort = 3000;

        // 3. For each target
        targets.forEach((target, i) => {
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
            _idyll.stdout.on('data', async (data) => {
                if (target === 'video' && data.includes('Serving files from:')) {
                    console.log('\n\t🎙️ Recording audio...');
                    const audioData = await getVideoAudioData(header, content);

                    console.log('audioData', JSON.stringify(audioData, null, 2));

                    const pupeteerTimingMultiplier = 4.0;
                    const slideTiming = audioData.map(d => pupeteerTimingMultiplier * d.duration).join(',');

                    console.log('\t🎥 Recording video...');
                    const puppeteer = require('puppeteer');
                    const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
                    // const { record } = require('puppeteer-recorder');


                    const sourceFile = `input-video-11.mp4`;

                    /**
                     * Need to do three things:
                     *
                     *  1. Record the video
                     *      a. Need to make sure its the proper duration
                     *  2. Record the audio tracks
                     *      a. Need to have an array of text to record
                     *  3. Stich the audio tracks and video together.
                     *      a. The audio tracks need to come in at the right position
                     *      b. The video also needs to cut at the right timing. This means that the
                     *          duration of each audio track needs to be known ahead of time. So the
                     *          audio step needs to be done first, then the metadata (track length)
                     *          needs to be passed into the pupeteer recording.
                     */

                    const sizeMultiplier = 1.0;

                    const browser = await puppeteer.launch({
                        defaultViewport: { width: 1280 * sizeMultiplier, height: 720 * sizeMultiplier }
                    });
                    const page = await browser.newPage();
                    const recorder = new PuppeteerScreenRecorder(page, {
                        // ffmpeg_Path: '/opt/homebrew/bin/ffmpeg',
                        ffmpeg_Path: '/usr/local/bin/ffmpeg',
                        videoFrame: {
                            width: 1280 * sizeMultiplier,
                            height: 720 * sizeMultiplier,
                        },
                        aspectRatio: '16:9',
                    });

                    // page.on('pageerror', pageerr=> {
                    //     console.log('pageerror occurred: ', pageerr);
                    // })
                    // console.log(`http://localhost:${videoPort}?slideTiming=${slideTiming}`)
                    await page.setDefaultNavigationTimeout(0);

                    await recorder.start(sourceFile); // video must have .mp4 has an extension.
                    await page.goto(`http://localhost:${videoPort}?slideTiming=${slideTiming}`);
                    const watchDog = page.waitForFunction('window.status === "ready"');
                    await watchDog;

                    // await record({
                    //     browser: browser, // Optional: a puppeteer Browser instance,
                    //     page: page, // Optional: a puppeteer Page instance,
                    //     output: 'video-input5.mp4',
                    //     fps: 60,
                    //     frames: 60 * audioData.reduce((memo, { duration }) => {
                    //         return memo + duration;
                    //     }, 0), // X seconds at 60 fps
                    //     prepare: async function (browser, page) {
                    //         await page.evaluate(function() {
                    //             window.startMovie();
                    //         });
                    //     },
                    //     render: function (browser, page, frame) { /* executed before each capture */ }
                    // });

                    // await page.waitForNavigation({
                    //     waitUntil: 'networkidle0',
                    // });

                    // await page.evaluate((function() {
                    //     const urlSearchParams = new URLSearchParams(window.location.search);
                    //     const params = Object.fromEntries(urlSearchParams.entries());
                    //     console.log('slideTiming', params['slideTiming']);
                    //     const timings = (params['slideTiming'] || '').split(',').map(d => +d);
                    //     console.log('timings', timings);
                    // }))

                    // await page.waitForTimeout(15000);
                    // await page.waitForTimeout(15000);

                    await page.evaluate(function() {
                        window.startMovie();
                    });

                    await page.waitForTimeout(audioData.reduce((memo, { duration }) => {
                        return memo + pupeteerTimingMultiplier * duration;
                    }, 0));
                    await recorder.stop();
                    await browser.close();
                    console.log('\t🎥 Recording complete.');

                    console.log('\t🎬 Compositing video.');

                    let audioOffset = 0;

                    const editlyOpts = {
                        // enableFfmpegLog: true,
                        outPath: 'video-out.mp4',
                        width: 1280 * sizeMultiplier,
                        height: 720 * sizeMultiplier,
                        // defaults: {
                        //     layer: { fontPath: './assets/Patua_One/PatuaOne-Regular.ttf' },
                        // },
                        clips: [
                            { layers: [{ type: 'video', path: sourceFile, cutFrom: 1.0 }] }
                        ],
                        audioNorm: { enable: true, gaussSize: 3, maxGain: 100 },
                        clipsAudioVolume: 50,
                        audioTracks: audioData.map(({ filename, duration }) => {
                            let ret = {
                                path: filename,
                                start: audioOffset
                            }

                            audioOffset += duration / 1000;
                            return ret;
                        })
                    }

                    console.log('editly opts', JSON.stringify(editlyOpts, null, 2));

                    await editly(editlyOpts).catch(console.error);

                    console.log('\t🎬 Compositing complete.\n');
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