const run = async () => {

  try {
    const aperture = require('aperture');
    const sizeMultiplier = 1.0;

    const apertureOptions = {
        fps: 30,
        cropArea: {
            x: 0,
            y: 0,
            width: 1280 * sizeMultiplier,
            height: 720 * sizeMultiplier
        }
    };

    const screens = await aperture.screens();
    console.log(screens);
    // await aperture.startRecording(apertureOptions);
    // const _apertureFile = await aperture.stopRecording();
  } catch(e) {
    console.log('err', e);
  }
}
run();