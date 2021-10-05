
const AST = require('idyll-ast');

module.exports = (header, content) => {


  let id = 0;

  const paramToVar = (param, idx) => {
    return `scene_${idx}_${param}`;
  }

  let sceneIdxVars = 0;
  let sceneIdxVarsControls = 0;
  let sceneIdxContent = 0, sceneIdxContentControls = 0, sceneIdxContentSlides = 0;
  let presenterNotesIndex = 0;

  let sceneStartIndex = 1, sceneEndIndex = -1;
  let sceneStartIndexControls = 1, sceneEndIndexControls = -1;

  const { data, ...headerProps } = header;

  const metaNodes = [{
    id: id++,
    type: 'component',
    name: 'meta',
    properties: {
      title: {
        type: 'value',
        value: headerProps.title || 'Article Title'
      },
      description: {
        type: 'value',
        value: headerProps.subtitle || ''
      }
    }
  }];

  const varNodes = content.scenes.reduce((memo, contentFragment) => {
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
    return memo;
  }, []);

  const headerNodes = header.data ? Object.keys(header.data).map(k => {
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
  }) : [];


  const slideshowNodes = [
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
        children: content.scenes.reduce((memo, contentFragment) => {
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
                properties: { ...Object.keys(contentFragment.parsed.parameters || {}).reduce((memo, param) => {
                  memo[param] = {
                    type: 'variable',
                    value: paramToVar(param, sceneIdxContent-1)
                  }
                  return memo;
                }, {
                  data: {
                    type: 'expression',
                    value: `{ ${Object.keys(header.data || {}).map(k => { return `${k}:${k}` }).join(', ')} }`
                  }
                }), ...(contentFragment.parsed.graphicProps || {}) }
              }
            ]
          })

          sceneStartIndex = sceneEndIndex;

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
      }].concat(content.scenes.reduce((memo, contentFragment) => {
        sceneIdxContentSlides++
        currentScene = contentFragment
        contentFragment.stages.forEach((stage, _stageIdx) => {
          memo.push({
            id: id++,
            type: 'component',
            name: 'Slide',
            properties: {
              onEnter: {
                type: 'expression',
                  value: stage.parsed.parameters ? Object.keys(stage.parsed.parameters).map(k => `${paramToVar(k, sceneIdxContentSlides - 1)} = ${JSON.stringify(stage.parsed.parameters[k])}`).join(';') : (_stageIdx === 0 ? (
                    Object.keys(currentScene.parameters || {}).map(k => `${paramToVar(k, sceneIdxContentSlides - 1)} = ${JSON.stringify(currentScene.parameters[k])}`).join(';')
                  ) : '')
              }
            },
            children: (stage.parsed.summary || stage.summary || stage.text).trim().split(/\n\n+/).map(t => {
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

      return memo;

      }, []))
    }, {
      id: id++,
      type: 'component',
      name: 'Broadcaster',
      properties: {
        peerkey: {
          type: 'value',
          value: `gridyll-presentation-${Math.round(Math.random() * 10000)}`
        },
        __slideshowIndex: {
          type: 'variable',
          value: '__slideshowIndex'
        },
        __slideshowLength: {
          type: 'variable',
          value: '__slideshowLength'
        },
        ...content.scenes.reduce((memo, contentFragment) => {
          Object.keys(contentFragment.parsed.parameters || {}).forEach(param => {
            console.log(param, paramToVar(param, sceneIdxVarsControls));
            memo[paramToVar(param, sceneIdxVarsControls)] = {
              type: 'variable',
              value: paramToVar(param, sceneIdxVarsControls)
            }
          })
          sceneIdxVarsControls++;
          return memo;
        }, {})
      },
      children: [{
        id: id++,
        type: 'component',
        name: 'div',
        properties: {
          className: {
            type: 'value',
            value: 'gridyll-presenter-notes'
          }
        },
        children: content.scenes.reduce((memo, scene) => {
          scene.stages.forEach((stage) => {
            memo.push({
              id: id++,
              type: 'component',
              name: 'Conditional',
              properties: {
                if: {
                  type: "expression",
                  value: `__slideshowIndex === ${++presenterNotesIndex}`
                }
              },
              children: (stage.text || '').trim().split(/\n\n+/).map(t => {
                return {
                  id: id++,
                  type: 'component',
                  name: 'p',
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
          return memo;
        }, [])
      },
        {
        id: id++,
        type: 'component',
        name: 'div',
        properties: {
          className: {
            type: 'value',
            value: 'gridyll-control-container'
          }
        },
        children: content.scenes.reduce((memo, scene) => {


          scene.stages.forEach((stage) => {
            memo.push({
              id: id++,
              type: 'component',
              name: 'Conditional',
              properties: {
                if: {
                  type: "expression",
                  value: `__slideshowIndex == ${sceneStartIndexControls++}`
                }
              },
              children: Object.keys(stage.parsed.controls || {}).map(k => {
                const getControl = () => {
                  const { freeform, range, set } = stage.parsed.controls[k];

                  if (range) {
                    if (range.length < 2) {
                      console.error('Error: range provided with fewer than 2 parameters. Please provide a range like [min, max], or [min, max, step].');
                    }
                    if (!range.length > 2) {
                      console.warn('Warning: range provided without set parameter');
                    }

                    return {
                      id: id++,
                      type: 'component',
                      name: 'Range',
                      properties: {
                        value: {
                          type: 'variable',
                          value: paramToVar(k, sceneIdxContentControls)
                        },
                        min: {
                          type: 'value',
                          value: +range[0]
                        },
                        max: {
                          type: 'value',
                          value: +range[1]
                        },
                        step: range.length > 2 ? {
                          type: 'value',
                          value: +range[2]
                        } : undefined
                      }
                    }
                  }
                  else if (set) {
                    let _set = new Set(set)
                    if (_set.has(true) && _set.has(false) && _set.size === 2) {
                      return {
                        id: id++,
                        type: 'component',
                        name: 'Boolean',
                        properties: {
                          value: {
                            type: 'variable',
                            value: paramToVar(k, sceneIdxContentControls)
                          }
                        }
                      }
                    }
                    return {
                      id: id++,
                      type: 'component',
                      name: 'Select',
                      properties: {
                        value: {
                          type: 'variable',
                          value: paramToVar(k, sceneIdxContentControls)
                        },
                        options: {
                          type: 'expression',
                          value: JSON.stringify([...set.values()].map(v => { return { label: v, value: v} }))
                        }
                      }
                    }
                  }
                  else if (freeform) {
                    return {
                      id: id++,
                      type: 'component',
                      name: 'TextInput',
                      properties: {
                        value: {
                          type: 'variable',
                          value: paramToVar(k, sceneIdxContentControls)
                        }
                      }
                    }
                  }
                  else {
                    console.warn(`Could not identify control type for parameter ${k}`);
                    return {
                      id: id++,
                      type: 'component',
                      name: 'TextInput',
                      properties: {
                        value: {
                          type: 'variable',
                          value: paramToVar(k, sceneIdxContentControls)
                        }
                      }
                    }
                  }
                }

                return {
                  id: id++,
                  type: 'component',
                  name: 'div',
                  children: [
                    {
                      id: id++,
                      type: 'textnode',
                      value: k.replace(/\_/g, ' ')
                    },
                    getControl()
                  ]
                }
              })
            })
          })


          sceneIdxContentControls++;
          return memo;
        }, [])
      }]
    }]




  const ast = {
    id: id++,
    type: 'component',
    name: 'root',
    children: [
      ...metaNodes,
      ...varNodes,
      ...headerNodes,
      ...slideshowNodes,
      {
        id: id++,
        type: 'component',
        name: "SlideIndex",
        properties: {
          index: {
            type: "variable",
            value: "__slideshowIndex"
          },
          length: {
            type: "variable",
            value: "__slideshowLength"
          }
        }
      }
    ]
  }

  // console.log(JSON.stringify(ast, null, 2));
  return ast;
}
