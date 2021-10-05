
const path = require('path');
const fs = require('fs-extra');
const execSync = require('child_process').execSync;

const _range = (start, end, step = 1) => {
  let output = [];
  if (typeof end === 'undefined') {
    end = start;
    start = 0;
  }
  for (let i = start; i <= end; i += step) {
    output.push(i);
  }
  return output;
};

const cartesian = (a) => {
  if (!a || !a.length) {
    return [];
  }
  const r = a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
  if (r.length && Array.isArray(r[0])) {
    return r;
  } if (r.length) {
    return r.map(d => { return [d] });
  }
  return [];
}

const sortKeys = (keys) => {
  keys.sort((a, b) => {
    return b.localeCompare(a);
  })
  return keys;
}


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

            console.log(`Generating file ${outputFile}`);
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

      // scene.parsed.parameters = {
      //   src: `static/script-image-${target}-${sceneIdx}-0.png`
      // }
      scene.parsed.graphic = 'img';
      let src = `"static/script-image-" + ${sortKeys(Object.keys(scene.parsed.parameters)).map(k => `"${k}-" + scene_${sceneIdx}_${k}`).join(' + "-" + ')} + ".png"`;
      scene.parsed.graphicProps = target === 'static' ? (sceneIdx, stageIdx) => {
        src = `"static/script-image-" + ${sortKeys(Object.keys(scene.parsed.parameters)).map(k => `"${k}-" + scene_${sceneIdx}_stage_${stageIdx}_${k}`).join(' + "-" + ')} + ".png"`
        return {
          src: {
            type: 'expression',
            value: src
          }
        }
      } : {
          src: {
            type: 'expression',
            value: src
          }
      };

      scene.stages = scene.stages.map((stage, stageIdx) => {

        const filename = `${staticPath}/script-image-${sortKeys(Object.keys(scene.parsed.parameters)).map(k => `${k}-${stage.parsed.parameters[k]}`).join('-')}.png`;

        if (!fs.existsSync(filename)) {
          console.log('creating image', filename)
          try {
            execSync(commandFunc(stage.parsed.parameters, filename));
          } catch(e) {
            console.warn('Failed to generate file', filename)
            console.warn(e);
          }
        }

        if (stage.parsed.controls) {

          const allParams = Object.keys(scene.parsed.parameters);
          const controlParams = {...stage.parsed.controls}
          allParams.forEach((k) => {
            if(controlParams[k]) {
              // todo - make sure stage.parsed.parameters[k] is in the set
              return;
            }
            controlParams[k] = { set: [stage.parsed.parameters[k]] }
          })

          const xprod = cartesian(Object.keys(controlParams || {}).map(k => {
            const { range, set } = controlParams[k] || {};

            let values;
            if (range) {
              values = _range(range[0], range[1], range[2]);
            } else if (set) {
              values = set;
            } else {
              return false;
            }

            return values
          }).filter(d => d));

          xprod.forEach((values) => {
            const paramObj = values.reduce((memo, val, i) => {
              const k = Object.keys(controlParams || {})[i];
              memo[k] = val;
              return memo;
            }, {});

            const controlFile = `${staticPath}/script-image-${sortKeys(Object.keys(paramObj)).map(k => `${k}-${paramObj[k]}`).join('-')}.png`;

            if (!fs.existsSync(controlFile)) {
              try {
                execSync(commandFunc(paramObj, controlFile));
              } catch(e) {
                console.warn('Failed to generate file', controlFile)
                console.warn(e);
              }
            }
          })
        }

        // stage.parsed.parameters = {
        //   src: `static/script-image-${target}-${sceneIdx}-${stageIdx}.png`
        // }

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