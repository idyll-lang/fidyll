

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
const copy = require('fast-copy');

const escapeShell = (cmd)=> {
return '"'+cmd.replace(/&/g, '\\&').replace(/(["'$`\\])/g,'\\$1')+'"';
};

const { tmpdir } = require('os');

const { exec, spawn } = require('child_process');

const parseGridyllInput = require('./parse/parse-aml');
const serializeIdyll = require('./serialize-idyll');
const getVideoAudioData = require('./get-video-audio-data');
const normalize = require('./normalize-data');
const handleScripts = require('./handle-scripts');
const generateGifMap = require('./generate-gif-map');

function delay(time) {
    return new Promise(function(resolve) {
        setTimeout(resolve, time)
    });
 }

 const targetMap = {
    video: 'presentation'
  }

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
        let staticPort = 3000;

        let existingMetadata = {}
        if (fs.existsSync(path.join(this.projectPath, 'metadata.json'))) {
            existingMetadata = require(path.join(this.projectPath, 'metadata.json'));
        }
        const articleMetadata = {
            ...existingMetadata,
            title: idyllHeader.title,
            description: idyllHeader.subtitle || ''
        }
        const writeMetadata = () => {
            fs.writeFileSync(path.join(this.projectPath, 'metadata.json'), JSON.stringify(articleMetadata, null, 2));
        }

        writeMetadata();

        // 3. For each target
        targets.forEach(async (target, i) => {


            const idyllPath = path.join(this.projectPath, 'output', target, 'index.idyll');
            const idyllOutputPath = path.join(this.projectPath, 'output', target);
            const componentsOutputPath = path.join(this.projectPath, 'output', target, 'components');
            const dataOutputPath = path.join(this.projectPath, 'output', target, 'data');
            const dataInputPath = path.join(this.projectPath, 'data');
            const staticOutputPath = path.join(this.projectPath, 'output', target, 'static');
            const staticInputPath = path.join(this.projectPath, 'static');


            console.log(`Serializing markup for target ${target}`);
            let normalizedContent = normalize(copy(content), target);

            normalizedContent = handleScripts(normalizedContent, target, staticInputPath);

            let gifMap = {};
            if (target === 'static') {
                gifMap = await generateGifMap(normalizedContent, staticOutputPath);
            }
            // console.log(JSON.stringify(normalizedContent, null, 2));

            //    3.1. Serialize Idyll markup
            const outputText = serializeIdyll(target, idyllHeader, normalizedContent, gifMap);






            const captureScreenshotsOfElements = async (elements, pathPrefix) => {
                const _outputPath = path.join(this.projectPath, 'output', target, 'build', 'static');
                let _i = 0;
                for (const element of elements) {
                    try {
                        await element.screenshot({ path: `${_outputPath}/${pathPrefix}-${_i}.png` });
                    } catch(e) {
                        console.log('error in screenshot');
                        console.log(pathPrefix, _i);
                    }
                    _i += 1;
                }
            };

            fs.writeFileSync(idyllPath, outputText);
            console.log(`Serialization complete.\n`)

            if (target === 'video') {
                videoPort = 3000 + i;
            } else if (target === 'static') {
                staticPort = 3000 + i;
            }

            // console.log(`Executing for target ${target}`, `\n\tcd ${idyllOutputPath} && idyll --port ${3000 + i}`)


            //    3.2. Determine grid structure

            // TODO
            //      - Determine separately for each breakpoint
            //      - Determine separately for each section
            //          - maybe... associate constraints with each template?
            const stylesPath = path.join(this.projectPath, 'output', target, 'styles.css');
            const templateOptions = fs.readdirSync(path.join(__dirname, 'grid-templates', targetMap[target] || target)).filter(f => !['.ds_store'].includes(f.toLowerCase()));

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

            fs.copyFileSync(path.join(__dirname, 'grid-templates', targetMap[target] || target, chosenTemplate), path.join(idyllOutputPath, 'styles.css'));


            //    3.3. Define grid placement for text, graphics, notes


            //      TODO:
            //          1. For each breakpoint in the template:
            //              1.1. Place any elements for which there is no free dimension ()
            //              1.2. Launch pupeteer with page
            //              1.3. F



            // copy data and components
            try {
                fs.copySync(this.componentsPath, componentsOutputPath);
            } catch(e) {
                console.warn('No components found...');
            }
            try {
                fs.copySync(dataInputPath, dataOutputPath);
            } catch(e) {
                console.warn('No data found...');
            }
            try {
                fs.copySync(staticInputPath, staticOutputPath);
            } catch(e) {
                console.warn('No static files found...');
            }

            const _idyll = spawn(`cd ${idyllOutputPath} && idyll --ssr=false --port ${3000 + i}`, {
                shell: true
            });

            _idyll.stderr.on('data', (data) => {
                console.log(data.toString());
            })

            _idyll.stdout.on('data', async (data) => {
                if (target === 'static' && data.includes('Serving files from:')) {
                    console.log('Producing static PDF...');
                    const puppeteer = require('puppeteer');

                    const sizeMultiplier = 4.0;

                    const browser = await puppeteer.launch({
                        defaultViewport: { width: 1280 * sizeMultiplier, height: 720 * sizeMultiplier }
                    });
                    const page = await browser.newPage();
                    await page.setDefaultNavigationTimeout(0);


                    await page.goto(`http://localhost:${staticPort}`);

                    await page.addStyleTag({content: `
                        .gridyll-control-container {
                            display: none;
                        }

                        .article-header {
                            display: none;
                        }

                        h1.hed {
                            display: none;
                        }
                        .byline {
                            display: none;
                        }

                        .fidyll-appendix {
                            display: block;
                        }

                        img {
                            max-width: 100%;
                            max-height: 100%;
                            width: 100%;
                            margin: 2em auto 2em auto;
                        }
                    `})

                    await page.waitForTimeout(30000);

                    const graphics = await page.$$(':not(.fidyll-appendix) div.idyll-graphic');
                    console.log('graphics');
                    await captureScreenshotsOfElements(graphics, 'static-graphic');



                    const appendices = await page.$$('div.appendix-graphic-plex');
                    console.log('appendices');
                    await captureScreenshotsOfElements(appendices, 'static-appendix');

                    // replace the resulting HTML...
                    const _staticOutputPath = path.resolve(path.join(this.projectPath, 'output', target, 'build', 'static'));
                    await page.$$eval('div.idyll-graphic', (elements, _staticOutputPath) => {
                        elements.forEach((element, _i) => {
                            element.innerHTML = `<img src="${_staticOutputPath}/static-graphic-${_i}.png" />`;
                        })
                    }, _staticOutputPath);
                    await page.$$eval('div.appendix-graphic-plex', (elements, _staticOutputPath) => {
                        elements.forEach((element, _i) => {
                            element.innerHTML = `<img style="max-width: 100%;" src="${_staticOutputPath}/static-appendix-${_i}.png" />`;
                        })
                    }, _staticOutputPath);

                    await page.$$eval('.article-header', (elements, _staticOutputPath) => {
                        elements.forEach((element, _i) => {
                            element.outerHTML = '';
                        })
                    }, _staticOutputPath);




                    const allHtml = await page.evaluate(() => document.querySelector('*').outerHTML);
                    const _htmlOutputPath = path.join(this.projectPath, 'output', target, 'build', 'static.html');
                    fs.writeFileSync(_htmlOutputPath, allHtml);

                    const { data, targets, authorLink, ...headerFields } = idyllHeader;

                    const _pandoc = spawn(`pandoc ${Object.keys(headerFields).map(k => `-M ${k}=${escapeShell(headerFields[k])}`).join(' ')} --latex-engine=xelatex ${_htmlOutputPath} -s -o ${path.join(this.projectPath, 'output', 'static-output.pdf')}`, {
                        shell: true
                    });

                    _pandoc.stdout.on('data', (data) => {
                        console.log(`[pandoc stdout]: ${data}`);
                    });

                    _pandoc.stderr.on('data', (data) => {
                        console.error(`[pandoc stderr]: ${data}`);
                    });

                    _pandoc.on('close', (code) => {
                        if (code === 0) {
                            console.log(`PDF generation completed.`);
                            return;
                        }
                        console.log(`Pandoc exited with code ${code}`);
                    });
                }
                if (target === 'video' && data.includes('Serving files from:')) {
                    console.log('\n\t??????? Recording audio...');


                    const audioData = await getVideoAudioData(header, normalizedContent);

                    // console.log('audioData', JSON.stringify(audioData, null, 2));

                    const pupeteerTimingMultiplier = 1.0;
                    const slideTiming = audioData.map(d => pupeteerTimingMultiplier * d.duration).join(',');
                    articleMetadata.slideTiming = slideTiming;
                    writeMetadata();


                    console.log('\t???? Recording video...');

                    const puppeteer = require('puppeteer');


                    const sizeMultiplier = 1.0;//0.5;
                    const aperture = require('aperture');

                    const apertureOptions = {
                        fps: 30,
                        cropArea: {
                            x: 0,
                            y: 0,
                            width: 1280 * sizeMultiplier,
                            height: 720 * sizeMultiplier - 15
                        }
                    };
                    const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
                    // const { record } = require('puppeteer-recorder');



                    const sourceFileIdx = +process.env['SOURCE_INDEX'] || 30;
                    const sourceFile = path.join(tmpdir(), `input-video-${sourceFileIdx}.mp4`);
                    const sourceCopy = path.join(tmpdir(), `source-input-video-${sourceFileIdx}.mp4}`);

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


                    // const writeStream = fs.createWriteStream(sourceFile);

                    const browser = await puppeteer.launch({
                        // defaultViewport: { width: 1280 * sizeMultiplier, height: 720 * sizeMultiplier },
                        headless: false,
                        args: ['--app', "--window-position=0,60", '--disable-infobars', `--window-size=${1280 * sizeMultiplier},${720 * sizeMultiplier + 123}`]
                    });
                    const page = await browser.newPage();
                    await page._client.send('Emulation.clearDeviceMetricsOverride')

                    // const recorder = new PuppeteerScreenRecorder(page, {
                    //     // ffmpeg_Path: '/opt/homebrew/bin/ffmpeg',
                    //     ffmpeg_Path: process.env.FFMPEG_PATH || '/usr/local/bin/ffmpeg',
                    //     videoFrame: {
                    //         width: 1280 * sizeMultiplier,
                    //         height: 720 * sizeMultiplier,
                    //     },
                    //     aspectRatio: '16:9',
                    //     // fps: 60
                    // });


                    // await recorder.startStream(writeStream); // video must have .mp4 has an extension.

                    // await page.waitForTimeout(15000);
                    // await delay(15000);
                    // page.on('pageerror', pageerr=> {
                    //     console.log('pageerror occurred: ', pageerr);
                    // })
                    // console.log(`http://localhost:${videoPort}?slideTiming=${slideTiming}`)
                    await page.setDefaultNavigationTimeout(0);



                    await page.goto(`http://localhost:${videoPort}?slideTiming=${slideTiming}`);

                    // await page.waitForTimeout(15000);

                    // await delay(15000);
                    const watchDog = page.waitForFunction('window.status === "ready"');
                    await watchDog;
                    // await delay(15000);
                    // await page.waitForTimeout(15000);


                    // await page.evaluate((function() {
                    //     setTimeout(() => {

                    //     }, 15000);
                    // }))

                    const recorder = aperture();
                    await recorder.startRecording(apertureOptions);
                    await recorder.isFileReady;

                    // const coverImagePath = path.join(tmpdir(), 'title-screen.png');
                    // await page.screenshot({path: coverImagePath});
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

                    // await delay(15000);
                    // await page.waitForTimeout(30000);


                    await page.evaluate(function() {
                        window.startMovie();
                    });
                    // const coverImagePath = 'title-screen.png';
                    const ALL_IMAGES = false;

                    // for (var _slideIdx = 0; _slideIdx < audioData.length; _slideIdx++) {
                    //     await page.evaluate((idx) => {
                    //         window._setSlide(idx);
                    //     }, _slideIdx);

                    //     // await page.waitForTimeout(5000);

                    //     // await page.screenshot({path: path.join(tmpdir(), `slide-image-${_slideIdx}.png`)});
                    // }

                    // console.log('waiting for timeout....', audioData.reduce((memo, { duration }) => {
                    //     return memo + pupeteerTimingMultiplier * duration;
                    // }, 0));
                    const _audioDuration = audioData.reduce((memo, { duration }) => {
                        return memo + pupeteerTimingMultiplier * duration;
                    }, 0);

                    await page.waitForTimeout(_audioDuration);
                    // await page.waitForTimeout(audioData.reduce((memo, { duration }) => {
                    //     return memo + pupeteerTimingMultiplier * duration;
                    // }, 2500));
                    // await recorder.stop();
                    const _apertureFile = await recorder.stopRecording();
                    await browser.close();
                    // await writeStream.close();
                    console.log('\t???? Recording complete.');

                    console.log('\t???? Compositing video.');
                    fs.copyFileSync(_apertureFile, sourceCopy);

                    const _audioDurationWithoutHeader = audioData.filter((_, i) => i > 0).reduce((memo, { duration }) => {
                        return memo + pupeteerTimingMultiplier * duration;
                    }, 0);
                    const { getVideoDurationInSeconds } = require('get-video-duration');
                    const _inputDuration = 1000 * (await  getVideoDurationInSeconds(sourceCopy));
                    const extraUpFront = _inputDuration - _audioDurationWithoutHeader;

                    // console.log('_inputDuration', _inputDuration);
                    // console.log('_audioDuration', _audioDurationWithoutHeader);
                    // console.log('extraUpFront', extraUpFront);
                    let audioOffset = 0;

                    let clips;

                    // if (ALL_IMAGES) {
                    //     clips = audioData.map((d, i) => {
                    //         return {
                    //             layers: [{
                    //                 type: 'image',
                    //                 path: path.join(tmpdir(), `slide-image-${i}.png`),
                    //                 transition: null,
                    //                 zoomDirection: null
                    //             }],
                    //             duration: d.duration / 1000,
                    //             transition: null
                    //         }
                    //     });
                    // } else if (extraUpFront < 0) {
                    //     clips = [
                    //         { layers: [{ type: 'image', path: coverImagePath, duration: audioData[0].duration / 1000 }] },
                    //         { layers: [{ type: 'video', path: sourceCopy, cutFrom: (audioData[0].duration + extraUpFront) / 1000 }] },
                    //     ]
                    // } else {
                        clips = [
                            // { layers: [{ type: 'image', path: coverImagePath, duration: audioData[0].duration / 1000 }] },
                            // { layers: [{ type: 'video', path: sourceCopy, cutFrom: extraUpFront / 1000 }] }
                            { layers: [{ type: 'video', path: sourceCopy }] }
                        ]
                    // }

                    // console.log(JSON.stringify(clips))

                    const editlyOpts = {
                        // enableFfmpegLog: true,
                        outPath: path.join(this.projectPath, 'output', 'data-video.mp4'),
                        width: 1280 * sizeMultiplier,
                        height: 720 * sizeMultiplier,
                        // defaults: {
                        //     layer: { fontPath: './assets/Patua_One/PatuaOne-Regular.ttf' },
                        // },
                        defaults: {
                            transition: null,
                        },
                        clips: clips,
                        audioNorm: { enable: true, gaussSize: 3, maxGain: 100 },
                        clipsAudioVolume: 50,
                        audioTracks: audioData.map(({ filename, duration, text }) => {
                            let ret = {
                                path: filename,
                                start: audioOffset
                            }

                            // console.log('Text', text);
                            // console.log('Start', audioOffset);

                            audioOffset += duration / 1000;
                            return ret;
                        })
                    }

                    // console.log('editly opts', JSON.stringify(editlyOpts, null, 2));

                    await editly(editlyOpts).catch(console.error);

                    console.log('\t???? Compositing complete.\n');

                    console.log('\t???? Creating subtitles.\n');

                    const millisecondsToSRT = (ms) => {
                        const hours = Math.floor(ms / 1000 / 60 / 60);
                        ms = ms - hours * 60 * 60 * 1000;
                        const minutes = Math.floor(ms / 1000 / 60);
                        ms = ms - minutes * 60 * 1000;
                        const seconds = Math.floor(ms / 1000);
                        ms = Math.floor(ms - seconds * 1000);

                        return `${hours}:${minutes}:${seconds},${ms}`;
                    }

                    let subtitleOffset = 0;
                    let subtitleIndex = 0;
                    const subtitleString = audioData.map(({ filename, duration, text }) => {

                        const sentences = text.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
                        const totalCharacters = sentences.reduce((memo, str) => {
                            return memo + str.length;
                        }, 0);

                        const charToDuration = (charlen) => charlen * duration / totalCharacters;

                        const output = sentences.map((sentence, _sentenceIndex) => {

                            const _duration = charToDuration(sentence.length);

                            const ret =  `${++subtitleIndex}
                            ${millisecondsToSRT(subtitleOffset)} --> ${millisecondsToSRT(subtitleOffset + _duration)}
                            ${sentence}`;

                            subtitleOffset += _duration;

                            return ret.trim();
                        }).join('\n\n');

                        return output;
                    }).join('\n\n').split('\n').map(str => str.trim()).join('\n');

                    fs.writeFileSync(path.join(this.projectPath, 'output', 'data-video.srt'), subtitleString);


                    console.log('\t???? Subtitles complete.\n');
                }
            });


            //    3.4. Do any necessary post processing (e.g. record video, composite static images)

            // generating static images

        })

    }

    ensureTargetsExist(targets) {
        targets.forEach((target) => {
            // console.log('target', target);
            if (!fs.pathExistsSync(path.join(this.projectPath, 'output', target))) {
                console.log(`\tCreating target '${target}' at path ${path.join(this.projectPath, 'output', target)}`);
                fs.copySync(path.join(__dirname, 'output', targetMap[target] || target), path.join(this.projectPath, 'output', target));

                console.log('\tInstalling dependencies with npm....');
                spawn(`cd ${path.join(this.projectPath, 'output', target)} && npm install`, {
                    shell: true
                });
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