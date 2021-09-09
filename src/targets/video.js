
const AST = require('idyll-ast');

const summarize = require('../summarize-text');

module.exports = (header, content) => {


  let id = 0;

  const paramToVar = (param, idx) => {
    return `scene_${idx}_${param}`;
  }

  let sceneIdxVars = 0;
  let sceneIdxVarsControls = 0;
  let sceneIdxContent = 0, sceneIdxContentControls = 0, sceneIdxContentSlides = 0;

  let sceneStartIndex = 1, sceneEndIndex = -1;
  let sceneStartIndexControls = 1, sceneEndIndexControls = -1;

  const { data, ...headerProps } = header;


  const ast = {
    id: id++,
    type: 'component',
    name: 'root',
    children: [].concat(content.reduce((memo, contentFragment) => {
      switch(contentFragment.type) {
        case 'scene':
          Object.keys(contentFragment.parsed.parameters || {}).forEach(param => {
            memo.push({
              id: id++,
              type: 'var',
              properties: {
                name: {
                  type: 'value',
                  value: paramToVar(param, sceneIdxVars)
                },
                value: {
                  type: 'value',
                  value: contentFragment.parsed.parameters[param]
                }
              }
            })
          })
          sceneIdxVars++;
        break;
      }
      return memo;
    }, [])).concat(header.data ? Object.keys(header.data).map(k => {
      const source = header.data[k];
      return {
        id: id++,
        type: 'data',
        properties: {
          name: {
            type: 'value',
            value: k
          },
          source: {
            type: 'value',
            value: source
          },
          // async: {
          //   type: 'value',
          //   value: true
          // },
          // initalValue: {
          //   type: 'expression',
          //   value: '[]'
          // }
        }
      }
    }) : []).concat([
      {
        id: id++,
        type: 'var',
        properties: {
          name: {
            type: "value",
            value: "__slideshowIndex"
          },
          value: {
            type: "value",
            value: 0
          }
        }
      }, {
        id: id++,
        type: 'var',
        properties: {
          name: {
            type: "value",
            value: "__slideshowLength"
          },
          value: {
            type: "value",
            value: 0
          }
        }
      },
      {
        id: id++,
        type: 'component',
        name: 'Slideshow',
        properties: {
          fullWidth: {
            type: "value",
            value: true
          },
          currentSlide: {
            type: "variable",
            value: "__slideshowIndex"
          },
          numSlides: {
            type: "variable",
            value: "__slideshowLength"
          }
        },
        children: [{
          id: id++,
          type: 'component',
          name: 'Graphic',
          children: content.reduce((memo, contentFragment) => {
            if (contentFragment.type === 'scene') {
              sceneIdxContent++;
              sceneEndIndex = sceneStartIndex + contentFragment.stages.length;
              memo.push({
                id: id++,
                type: 'component',
                name: 'Conditional',
                properties: {
                  if: {
                    type: "expression",
                    value: `__slideshowIndex >= ${sceneStartIndex} && __slideshowIndex < ${sceneEndIndex}`
                  }
                },
                children: [
                  {
                    id: id++,
                    type: 'component',
                    name: contentFragment.parsed.graphic,
                    properties: Object.keys(contentFragment.parsed.parameters || {}).reduce((memo, param) => {
                      memo[param] = {
                        type: 'variable',
                        value: paramToVar(param, sceneIdxContent-1)
                      }
                      return memo;
                    }, {
                      data: {
                        type: 'expression',
                        value: `{ ${Object.keys(header.data).map(k => { return `${k}:${k}` }).join(', ')} }`
                      }
                    })
                  }
                ]
              })

              sceneStartIndex = sceneEndIndex;
            }

            return memo;
          }, [])
        }, {
          id: id++,
          type: 'component',
          name: 'Slide',
          children: [
            {
              id: id++,
              type: 'component',
              name: 'Header',
              properties: Object.keys(headerProps).reduce((memo, key) => {
                // TODO - maybe need to handle arrays, multiple authors here
                memo[key] = {
                    type: 'value',
                    value: headerProps[key]
                }
                return memo;
              }, {
                background: {
                  type: 'value',
                  value: '#ffffff'
                },
                color: {
                  type: 'value',
                  value: '#333333'
                }
              })
            }
          ]
        }].concat(content.reduce((memo, contentFragment) => {
          switch(contentFragment.type) {
            case 'scene':
              sceneIdxContentSlides++
              currentScene = contentFragment
              contentFragment.stages.forEach(async (stage, _stageIdx) => {
                memo.push({
                  id: id++,
                  type: 'component',
                  name: 'Slide',
                  properties: {
                    onEnter: {
                      type: 'expression',
                        value: stage.parsed.parameters ? Object.keys(stage.parsed.parameters).map(k => `${paramToVar(k, sceneIdxContentSlides - 1)} = ${stage.parsed.parameters[k]}`).join(';') : (_stageIdx === 0 ? (
                          Object.keys(currentScene.parameters || {}).map(k => `${paramToVar(k, sceneIdxContentSlides - 1)} = ${currentScene.parameters[k]}`).join(';')
                        ) : '')
                    }
                  },
                  children: stage.text.trim().split(/\n\n+/).map(t => {
                    // console.log('text', t);
                    summarize(t);
                    return {
                      id: id++,
                      type: 'component',
                      name: 'div',
                      children: [
                        {
                          id: id++,
                          type: 'textnode',
                          value: t
                        }
                      ]
                    }
                  })
              })
            })

          }
          return memo;

        }, []))
      },
      {
        id: id++,
        type: 'component',
        name: "VideoStepper",
        properties: {
          index: {
            type: "variable",
            value: "__slideshowIndex"
          },
          length: {
            type: "variable",
            value: sceneEndIndex
          }
        }
      },
      {
        id: id++,
        type: 'component',
        name: "SlideIndex",
        properties: {
          index: {
            type: "variable",
            value: "__slideshowIndex"
          }
        }
      }])
    }

  // console.log(JSON.stringify(ast, null, 2));
  return ast;
}
