

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

  const voiceovers = content.scenes.reduce((memo, contentFragment) => {
    memo.push({
      text: ((contentFragment.forward || '') + ' ' + (contentFragment.text || '')).trim()
    })

    contentFragment.stages.forEach((stage, idx) => {
      memo.push({
        text: stage.text || ''
      })
    })
    return memo;
  }, initialArray).map(({text}) => {
    return { text: text
        .replace(/\_/g, ' ')
        .replace(/[[^\/\\]+[\/\\]\]/g, '')
        .replace(/[\s\n]+/g, ' ').trim() };
  }).filter(({ text }) => {
    return text !== ''
  });

  console.log('voiceovers', voiceovers)


  const client = new textToSpeech.TextToSpeechClient();
  const audioData = await Promise.all(voiceovers.map(async ({ text }) => {

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

    return {
      text: text,
      filename: filename,
      duration: duration
    }

  }))

  return audioData;
}