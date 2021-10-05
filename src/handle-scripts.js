
const path = require('path');
const execSync = require('child_process').execSync;

module.exports = (content, target, staticPath) => {

  content.scenes = content.scenes.map((scene, sceneIdx) => {
    if (scene.parsed.script) {
      let commandFunc = () => {};
      switch(path.extname(scene.parsed.script).toLowerCase()) {
        case '.py':
          commandFunc = (params, outputFile) => {

          }
          break;
        case '.jl':
          commandFunc = (params, outputFile) => {

            const juliaPath = `/Applications/Julia-1.6.app/Contents/Resources/julia/bin/julia`;
            return `${juliaPath} -L ${scene.parsed.script} -E 'create_graphic(Dict(${Object.keys(params).map(k => `"${k}" => ${JSON.stringify(params[k])}`).join(', ')}), "${outputFile}")'`
          }
          break;
        case '.r':
          commandFunc = (params, outputFile) => {

          }
          break;
        default:
          console.warn(`Script file type ${path.extname(scene.parsed.script).toLowerCase()} not recognized. Supported extensions are .py (python), .jl (julia), and .r (rstats).`);
      }

      scene.parsed.parameters = {
        src: `static/script-image-${target}-${sceneIdx}-0.png`
      }
      scene.parsed.graphic = 'img';
      scene.stages = scene.stages.map((stage, stageIdx) => {
        execSync(commandFunc(stage.parsed.parameters, `${staticPath}/script-image-${target}-${sceneIdx}-${stageIdx}.png`));

        stage.parsed.parameters = {
          src: `static/script-image-${target}-${sceneIdx}-${stageIdx}.png`
        }

        return stage;
      });

      // TODO - update appendix!
      if (scene.parsed.appendix) {
        console.warn('Serializing appendix from server-side script not yet supported.');
      }
    }

    return scene;
  })

  return content;

}