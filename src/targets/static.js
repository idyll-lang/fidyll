
const AST = require('idyll-ast');

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

module.exports = (header, content) => {


  let id = 0;

  const paramToVar = (param, idx) => {
    return `scene_${idx}_${param}`;
  }

  let sceneIdxVars = 0;
  let sceneIdxContent = 0;
  const { data, ...headerProps } = header;


  const varDeclarationNodes = content.scenes.reduce((memo, scene, sceneIdx) => {
    Object.keys(scene.parsed.parameters || {}).forEach(param => {
      scene.stages.forEach((stage, stageIdx) => {
        memo.push({
          id: id++,
          type: 'var',
          properties: {
            name: {
              type: 'value',
              value: `scene_${sceneIdx}_stage_${stageIdx}_${param}`
            },
            value: {
              type: 'value',
              type: Array.isArray(stage.parsed.parameters[param]) ? 'expression' : 'value',
              value: Array.isArray(stage.parsed.parameters[param]) ? JSON.stringify(stage.parsed.parameters[param]) : stage.parsed.parameters[param]
            }
          }
        })
      })
    })
    sceneIdxVars++;
    return memo;
  }, []);

  const appendices = content.scenes.map((contentFragment, i) => {
    const appendixProps = contentFragment.parsed.appendix || contentFragment.parsed.controls || {};

    const sceneProps = Object.keys(contentFragment.parsed.parameters || {}).reduce((memo, param) => {
      memo[param] = {
        type: 'value',
        value: contentFragment.parsed.parameters[param]
      }
      return memo;
    }, {
      data: {
        type: 'expression',
        value: `{ ${Object.keys(header.data || {}).map(k => { return `${k}:${k}` }).join(', ')} }`
      }
    })
    //   const xprod = cartesian(Object.keys(contentFragment.parsed.controls || {}).map(k => {
    //     const { range, set } = contentFragment.parsed.controls[k];

    //     let values;
    //     if (range) {
    //       values = _range(range[0], range[1], range[2]);
    //     } else if (set) {
    //       values = set;
    //     } else {
    //       return false;
    //     }

    //     return values
    //   }).filter(d => d))

    // console.log('input', Object.keys(contentFragment.parsed.controls || {}).map(k => {
    //   const { range, set } = contentFragment.parsed.controls[k];

    //   let values;
    //   if (range) {
    //     values = _range(range[0], range[1], range[2]);
    //   } else if (set) {
    //     values = set;
    //   } else {
    //     return false;
    //   }

    //   return values
    // }).filter(d => d))
    // console.log('output', xprod);

    const controlNames = Object.keys(appendixProps || {}).map(k => {
      const { range, set } = appendixProps[k];
      if (!range && !set) {
        return false;
      }

      return k;
    }).filter(d => d);

    if (!Object.keys(appendixProps || {}).length) {
      return null;
    }

    // const appendix = {};
    const appendix = {
      id: id++,
      type: 'component',
      name: 'div',
      children: [
        {
          id: id++,
          type: 'component',
          name: 'div',
          children: [
            {
              id: id++,
              type: 'component',
              name: 'h2',
              children: [{
                id: id++,
                type: 'textnode',
                value: `Appendix Scene ${i+1}`
              }]
            }, {
              id: id++,
              type: 'component',
              name: 'div',
              properties: {
                className: {
                  type: 'value',
                  value: 'appendix-graphic-container'
                }
              },
              children: [{
                id: id++,
                type: 'component',
                name: 'div',
                children: [{
                  id: id++,
                  name: 'h3',
                  type: 'component',
                  children: [
                  //   {
                  //   id: id++,
                  //   type: 'textnode',
                  //   value: `Appendix Scene ${i+1} ${k}`
                  // },
                  ]
                },
                ...cartesian(Object.keys(appendixProps || {}).map(k => {
                  const { range, set } = appendixProps[k];

                  let values;
                  if (range) {
                    values = _range(range[0], range[1], range[2]);
                  } else if (set) {
                    values = set;
                  } else {
                    return false;
                  }

                  return values
                }).filter(d => d)).reduce((memo, params) => {
                  memo.push({
                    id: id++,
                    type: 'component',
                    name: 'div',
                    properties: {
                      className: {
                        type: 'value',
                        value: 'appendix-graphic-holder'
                      },
                      style: {
                        type: 'expression',
                        value: `{
                          margin: '0 auto',
                          textAlign: 'center'
                        }`
                      }
                    },
                    children: [{
                      id: id++,
                      type: 'component',
                      name: contentFragment.parsed.graphic,
                      properties: {
                        ...sceneProps,
                        ...Object.fromEntries(params.map((param, idx) => {
                          return [controlNames[idx], {
                            type: 'value',
                            value: param
                          }]
                        })),
                        src: {
                          type: 'value',
                          value: `static/script-image-${sortKeys(Object.keys(contentFragment.parsed.parameters)).map((param, idx) => `${param}-${params[Object.keys(appendixProps || {}).indexOf(param)] || sceneProps[param].value}`).join('-')}.png`
                        }
                      }
                    }, {
                      id: id++,
                      type: 'component',
                      name: 'div',
                      properties: {
                        style: {
                          type: 'expression',
                          value: `{
                            transform: 'scale(0.666)'
                          }`
                        }
                      },
                      children: params.map((param, idx) => {
                        return {
                          id: id++,
                          type: 'textnode',
                          value: `[Equation latex:"${controlNames[idx]} = ${param}" /][br/]`
                        }
                      })
                    }]
                  })
                  return memo;
                }, []).filter(d => d).reduce((memo, element, idx, arr) => {
                  const appendixGroupSize = 4;
                  memo.currentElements.push(element);
                  if (memo.currentElements.length === appendixGroupSize || idx === arr.length - 1) {
                    memo.elementGroups.push(memo.currentElements);
                    memo.currentElements = [];
                  }
                  return memo;
                }, { elementGroups: [], currentElements: [] }).elementGroups.map(( elementGroup ) => {
                  return {
                    id: id++,
                    type: 'component',
                    name: 'div',
                    properties: {
                      className: {
                        value: 'appendix-graphic-plex',
                        type: 'value'
                      }
                    },
                    children: elementGroup
                  }
                }),
]
              }]
            }
          ]
        }
      ]
    }

    return appendix;

  }).filter(d => d);

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

  const headerNodes = [ {
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
      color: {
        type: 'value',
        value: '#333'
      },
      background: {
        type: 'value',
        value: '#fff'
      },
      fullWidth: {
        type: 'value',
        value: false
      }
    })
  }];

  const dataNodes = header.data ? Object.keys(header.data || {}).map(k => {
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

  const introductionNodes = content.introduction ? content.introduction.map((contentFragment) => {
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

  const sceneNodes = content.scenes.map((contentFragment, sceneIdx) => {
    sceneIdxContent++;
    return {
      id: id++,
      type: 'component',
      name: 'TextContainer',
      children: (contentFragment.foreward ? contentFragment.foreward.trim().split(/\n\n+/).map(t => {
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
        }) : []).concat(contentFragment.stages.reduce((arr, stage, stageIdx) => {

          arr = arr.concat(
            stage.text.trim().split(/\n\n+/).map(t => {
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
          )
          arr.push({
            id: id++,
            type: 'component',
            name: 'Graphic',
            children: [
              {
                id: id++,
                type: 'component',
                name: contentFragment.parsed.graphic,
                properties: {...Object.keys(stage.parsed.parameters || {}).reduce((memo, param) => {
                  memo[param] = {
                    type: 'variable',
                    value: `scene_${sceneIdx}_stage_${stageIdx}_${param}`
                  }
                  return memo;
                }, {
                  data: {
                    type: 'expression',
                    value: `{ ${Object.keys(header.data || {}).map(k => { return `${k}:${k}` }).join(', ')} }`
                  }
                }), ...(contentFragment.parsed.graphicProps ? contentFragment.parsed.graphicProps(sceneIdx, stageIdx) : {}) }
              },
              // TODO - uncomment me to re-enable controls.
              stage.parsed.controls ?
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
                children: Object.keys(stage.parsed.controls || {}).map(k => {
                  const { freeform, range, set } = stage.parsed.controls[k];

                  let _control;
                  const varName = `scene_${sceneIdx}_stage_${stageIdx}_${k}`;

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
                          value: varName
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
                            value: varName
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
                            value: varName
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
                          value: varName
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
                          value: varName
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
                        value: k.replace(/_/g, ''),
                      },
                      _control
                    ]
                  }
                })
              }
              : null
            ].filter(d => d)
          })

          return arr;
      }, []))
    }
  })

  const conclusionNodes = content.conclusion ? content.conclusion.map((contentFragment) => {
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
      ...varDeclarationNodes,
      ...headerNodes,
      ...dataNodes,
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
      },
      ...appendices
    ]
  };


  return ast;
}

