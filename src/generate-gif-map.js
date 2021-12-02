
const path = require('path');
const fs = require('fs-extra');
var gifFrames = require('gif-frames');

module.exports = async (content, staticOutputPath) => {
  const allGifs = [...content.scenes.filter((scene) => {
    return scene.parsed.graphic === 'img';
  }).reduce((memo, scene) => {
    scene.stages.forEach((stage) => {
      const src = stage.parsed.parameters.src;
      if (src && src.endsWith('.gif')) {
        memo.add(src);
      }
    })
    return memo;
  }, new Set())];

  const gifMap = {};

  for(var i = 0; i < allGifs.length; i++) {
    const normalizedGifPath = path.join(staticOutputPath, allGifs[i].replace('static/', ''));
    const frameData = await gifFrames({ url: normalizedGifPath, frames: 'all', cumulative: true });

    const imagePath = path.dirname(normalizedGifPath);
    const filename =  path.basename(normalizedGifPath).replace('.gif', '');

    fs.ensureDirSync(path.join(imagePath, filename));

    gifMap[allGifs[i]] = frameData.map((frame) => {
      // frame.getImage().pipe(fs.createWriteStream(path.join(imagePath, filename, `${frame.frameIndex}.png`)));
      return `${allGifs[i].replace('.gif', '')}/${frame.frameIndex}.png`;
    })
  }

  return gifMap;
}