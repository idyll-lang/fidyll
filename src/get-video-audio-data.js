

const util = require('util');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs-extra');
const getMP3Duration = require('get-mp3-duration');

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
 }
 return result;
}


module.exports = async (header, content) => {
  // Return an array of
  // [{ text: , duration: }]

  let initialArray = [{ text: header.title }];

  console.log('get audio data');
  const voiceovers = content.scenes.reduce((memo, contentFragment, sceneIdx) => {
    memo.push({
      text: ((contentFragment.forward || '') + ' ' + (contentFragment.text || '')).trim(),
      stageIdx: -1,
      sceneIdx: sceneIdx
    })

    contentFragment.stages.forEach((stage, idx) => {
      memo.push({
        text: stage.text || '',
        stageIdx: idx,
        sceneIdx: sceneIdx
      })
    })
    return memo;
  }, initialArray).map((d) => {

    // todo replace this hack with AST.getText(compile(text))
    return {
      ...d,
      text: d.text.toLowerCase()
      .replace(/[\s\n]+/g, ' ').trim()
      .replace(/\[cite [^\/]+\/\]/gi,'')
      .replace(/\[equation\]/gi,'')
      .replace(/\[\/equation\]/gi,'')
      .replace(/\[equation .*\/\]/gi,'')
      .replace(/\_/g, ' ')
      .replace(/[[^\/\\]+[\/\\]\]/g, '')
    };
  }).filter(({ text }) => {
    return text !== ''
  });

  console.log(voiceovers);

  const client = new textToSpeech.TextToSpeechClient();
  const audioData = await Promise.all(voiceovers.map(async ({ text, sceneIdx, stageIdx }) => {

    // Construct the request
    const request = {
        input: { text: text },
        // Select the language and SSML voice gender (optional)
        voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
        // select the type of audio encoding
        audioConfig: { audioEncoding: 'MP3' },
    };

    // Performs the text-to-speech request
    const [ response ] = await client.synthesizeSpeech(request);

    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile);
    const filename = `/tmp/${makeid(10)}.mp3`;
    await writeFile(filename, response.audioContent, 'binary');

    let duration = 5;
    try {
      duration = getMP3Duration(response.audioContent);
    } catch(e) {
      console.warn(e)
    }

    const scene = content.scenes[sceneIdx];
    if (scene) {
      const stage = scene.stages[stageIdx];
      if (stage && stage.parsed.video && stage.parsed.video.duration) {
        duration = stage.parsed.video.duration;
      }
    } else {
      console.log('no scene for', sceneIdx, stageIdx)
    }

    return {
      text: text,
      filename: filename,
      duration: duration
    }

  }))

  return audioData;
}