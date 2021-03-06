
const AST = require('idyll-ast');
const parseInline = require('../parse/parse-inline');

module.exports = (header, content) => {

  let id = 0;


  const paramToVar = (param, idx) => {
    return `scene_${idx}_${param}`;
  }

  let sceneIdxVars = 0;
  let sceneIdxContent = 0;
  let currentScene = null;


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

  const headerNodes = [
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
  ].concat(header.data ? Object.keys(header.data).map(k => {
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
  }) : []);


  const varDeclarationNodes = content.scenes.reduce((memo, scene) => {
    Object.keys(scene.parsed.parameters || {}).forEach(param => {
      memo.push({
        id: id++,
        type: 'var',
        properties: {
          name: {
            type: 'value',
            value: paramToVar(param, sceneIdxVars)
          },
          value: {
            type: Array.isArray(scene.parsed.parameters[param]) ? 'expression' : 'value',
            value: Array.isArray(scene.parsed.parameters[param]) ? JSON.stringify(scene.parsed.parameters[param]) : scene.parsed.parameters[param]
          }
        }
      })
    })
    sceneIdxVars++;
    return memo;
  }, []);


  const introductionNodes = content.introduction ? content.introduction.map(contentFragment => {
    return {
      id: id++,
      type: 'component',
      name: 'TextContainer',
      children: contentFragment.text.trim().split(/\n\n+/).map((t) => {
        return {
          id: id++,
          type: 'component',
          name: 'p',
          children: [
            {
              id: id++,
              type: 'textnode',
              value: t.replace(/\n/g, '\n\n')
            }
          ]
        }
      })
    }
  }) : [];

  const sceneNodes = content.scenes.map((contentFragment) => {
    sceneIdxContent++;
    currentScene = contentFragment.parsed;
    const scrollerOpts = currentScene.scroller || {};

    return {
      id: id++,
      type: 'component',
      name: 'Scroller',
      properties: {
        className: {
          type: 'value',
          value: `${(scrollerOpts.layout && scrollerOpts.layout === 'fullwidth') ? 'full-width' : ''} ${scrollerOpts.graphicAnchor && scrollerOpts.graphicAnchor !== 'middle' ? `graphic-anchor-${scrollerOpts.graphicAnchor}` : ''}`
        }
      },
      children: [
        {
          id: id++,
          type: 'component',
          name: 'Graphic',
          properties: {
            displayParameters: {
              type: 'value',
              value: contentFragment.parsed.parameters.displayParameters === undefined ? false : contentFragment.parsed.parameters.displayParameters
            },
            ...Object.keys(contentFragment.parsed.parameters || {}).reduce((memo, param) => {
              if (param === 'data' && header.data) {
                console.warn('Warning: overwriting built in data parameter');
              }
              memo[param] = {
                type: 'variable',
                value: paramToVar(param, sceneIdxContent-1)
              }
              return memo;
            }, {})
          },
          children: [
            {
              id: id++,
              type: 'component',
              name: contentFragment.parsed.graphic,
              properties: {...Object.keys(contentFragment.parsed.parameters || {}).reduce((memo, param) => {
                if (param === 'data' && header.data) {
                  console.warn('Warning: overwriting built in data parameter');
                }
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
            },
            // {
            //   id: id++,
            //   type: 'component',
            //   name: 'div',
            //   properties: {
            //     className: {
            //       type: 'value',
            //       value: 'gridyll-control-container'
            //     }
            //   },
            //   children: Object.keys(contentFragment.parsed.controls || {}).map(k => {
            //     const { freeform, range, set } = contentFragment.parsed.controls[k];

            //     let _control;

            //     if (range) {
            //       if (range.length < 2) {
            //         console.error('Error: range provided with fewer than 2 parameters. Please provide a range like [min, max], or [min, max, step].');
            //       }
            //       if (!range.length > 2) {
            //         console.warn('Warning: range provided without set parameter');
            //       }

            //       _control = {
            //         id: id++,
            //         type: 'component',
            //         name: 'Range',
            //         properties: {
            //           value: {
            //             type: 'variable',
            //             value: paramToVar(k, sceneIdxContent-1)
            //           },
            //           min: {
            //             type: 'value',
            //             value: +range[0]
            //           },
            //           max: {
            //             type: 'value',
            //             value: +range[1]
            //           },
            //           step: range.length > 2 ? {
            //             type: 'value',
            //             value: +range[2]
            //           } : undefined
            //         }
            //       }
            //     }
            //     else if (set) {
            //       let _set = new Set(set)
            //       if (_set.has(true) && _set.has(false) && _set.size === 2) {
            //         _control = {
            //           id: id++,
            //           type: 'component',
            //           name: 'Boolean',
            //           properties: {
            //             value: {
            //               type: 'variable',
            //               value: paramToVar(k, sceneIdxContent-1)
            //             }
            //           }
            //         }
            //       } else {
            //         _control = {
            //           id: id++,
            //           type: 'component',
            //           name: 'Select',
            //           properties: {
            //             value: {
            //               type: 'variable',
            //               value: paramToVar(k, sceneIdxContent-1)
            //             },
            //             options: {
            //               type: 'expression',
            //               value: JSON.stringify([...set.values()].map(v => { return { label: v, value: v} }))
            //             }
            //           }
            //         }
            //       }
            //     }
            //     else if (freeform) {
            //       _control = {
            //         id: id++,
            //         type: 'component',
            //         name: 'TextInput',
            //         properties: {
            //           value: {
            //             type: 'variable',
            //             value: paramToVar(k, sceneIdxContent-1)
            //           }
            //         }
            //       }
            //     }
            //     else {
            //       console.warn(`Could not identify control type for parameter ${k}`);
            //       _control = {
            //         id: id++,
            //         type: 'component',
            //         name: 'TextInput',
            //         properties: {
            //           value: {
            //             type: 'variable',
            //             value: paramToVar(k, sceneIdxContent-1)
            //           }
            //         }
            //       }
            //     }
            //     return {
            //       id: id++,
            //       type: 'component',
            //       name: 'div',
            //       children: [
            //         {
            //           id: id++,
            //           type: 'textnode',
            //           value: k.replace(/_/g, ''),
            //         },
            //         _control
            //       ]
            //     }
            //   })
            // }
          ]
        }
      ].concat(contentFragment.stages.map((stage, _stageIdx) => {
        return {
          id: id++,
          type: 'component',
          name: 'Step',
          children: [...(stage.text || '').trim().split(/\n\n+/).map(t => {
            return {
              id: id++,
              type: 'component',
              name: 'p',
              properties: {
                onEnterViewFully: {
                  type: 'expression',
                  value: stage.parsed.parameters ? Object.keys(stage.parsed.parameters).map(k => `${paramToVar(k, sceneIdxContent - 1)} = ${JSON.stringify(stage.parsed.parameters[k])}`).join(';') : (_stageIdx === 0 ? (
                    Object.keys(currentScene.parameters || {}).map(k => `${paramToVar(k, sceneIdxContent - 1)} = ${JSON.stringify(currentScene.parameters[k])}`).join(';')
                  ) : '')
                },
                scrollOffset: {
                  type: 'expression',
                  value: `{ top: 200, bottom: 200 }`
                }
              },
              children: [
                {
                  id: id++,
                  type: 'textnode',
                  value: parseInline(t, Object.keys(currentScene.parameters || {}).reduce((memo, key) => {
                    memo[key] = paramToVar(key, sceneIdxContent - 1);
                    return memo;
                  }, {}), currentScene.controls || {})
                },

              ]
            }
          }), Object.keys(stage.parsed.controls || {}).length ? {
            id: id++,
            type: 'component',
            name: 'details',
            properties: {
              className: {
                type: 'value',
                value: 'control-details'
              }
            },
            children: [{
              id: id++,
              type: 'component',
              name: 'summary',
              children: [{
                id: id++,
                type: 'textnode',
                value: "Controls"
              }]}, ...Object.keys(stage.parsed.controls || {}).map(k => {
                const { freeform, range, set } = stage.parsed.controls[k];

                let _control;

                if (range) {
                  if (range.length < 2) {
                    console.error('Error: range provided with fewer than 2 parameters. Please provide a range like [min, max], or [min, max, step].');
                  }
                  if (!range.length > 2) {
                    console.warn('Warning: range provided without set parameter');
                  }

                  _control = {
                    id: id++,
                    type: 'component',
                    name: 'Range',
                    properties: {
                      value: {
                        type: 'variable',
                        value: paramToVar(k, sceneIdxContent-1)
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
                    _control = {
                      id: id++,
                      type: 'component',
                      name: 'Boolean',
                      properties: {
                        value: {
                          type: 'variable',
                          value: paramToVar(k, sceneIdxContent-1)
                        }
                      }
                    }
                  } else {
                    _control = {
                      id: id++,
                      type: 'component',
                      name: 'Select',
                      properties: {
                        value: {
                          type: 'variable',
                          value: paramToVar(k, sceneIdxContent-1)
                        },
                        options: {
                          type: 'expression',
                          value: JSON.stringify([...set.values()].map(v => { return { label: v, value: v} }))
                        }
                      }
                    }
                  }
                }
                else if (freeform) {
                  _control = {
                    id: id++,
                    type: 'component',
                    name: 'TextInput',
                    properties: {
                      value: {
                        type: 'variable',
                        value: paramToVar(k, sceneIdxContent-1)
                      }
                    }
                  }
                }
                else {
                  console.warn(`Could not identify control type for parameter ${k}`);
                  _control = {
                    id: id++,
                    type: 'component',
                    name: 'TextInput',
                    properties: {
                      value: {
                        type: 'variable',
                        value: paramToVar(k, sceneIdxContent-1)
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
                      type: 'component',
                      name: 'div',
                      children: [{
                        id: id++,
                        type: 'textnode',
                        value: k.replace(/_/g, '')
                      }]
                    },
                    _control
                  ]
                }
              })]
          } : null, Object.keys(stage.parsed.animations || {}).length ? {
            id: id++,
            type: 'component',
            name: 'animator',
            properties: {
              ref: {
                type: 'value',
                value: `scene_${sceneIdxContent}_${_stageIdx}`
              },
              onEnterViewFully: {
                type: 'expression',
                value: `refs.scene_${sceneIdxContent}_${_stageIdx}.component.startAnimation(true)`
              },
              scrollOffset: {
                type: 'expression',
                value: `{ top: 200, bottom: 200 }`
              },
              animations: {
                type: 'expression',
                value: JSON.stringify(Object.keys(stage.parsed.animations).map((k) => { return { ...stage.parsed.animations[k], key: k } }))
              },
              ...Object.keys(stage.parsed.animations).reduce((memo, k) => {
                memo[k] = {
                  type: 'variable',
                  value: paramToVar(k, sceneIdxContent - 1)
                }
                return memo;
              }, {})
            },
            children: []
           } : null].filter(d => d)
        }
      }))
    }
  })


  const conclusionNodes = content.conclusion ? content.conclusion.map(contentFragment => {
    return {
      id: id++,
      type: 'component',
      name: 'TextContainer',
      children: contentFragment.text.trim().split(/\n\n+/).map((t) => {
        return {
          id: id++,
          type: 'component',
          name: 'p',
          children: [
            {
              id: id++,
              type: 'textnode',
              value: t.replace(/\n/g, '\n\n')
            }
          ]
        }
      })
    }
  }) : [];

  const ast = {
    id: id++,
    type: 'component',
    name: 'root',
    children: [
      ...metaNodes,
      ...headerNodes,
      ...varDeclarationNodes,
      ...introductionNodes,
      ...sceneNodes,
      ...conclusionNodes,
      {
        id: id++,
        type: 'component',
        name: 'TextContainer',
        properties: {},
        children: [{
          id: id++,
          type: 'component',
          name: 'Cite.References',
          properties: {},
          children: []
        }]
      }
    ]
  };

  return ast;
}
