
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
  const r = a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
  if (r.length && Array.isArray(r[0])) {
    return r;
  } if (r.length) {
    return r.map(d => { return [d] });
  }
  return [];
}

module.exports = (header, content) => {


  let id = 0;

  const paramToVar = (param, idx) => {
    return `scene_${idx}_${param}`;
  }

  let sceneIdxVars = 0;
  let sceneIdxContent = 0;
  const { data, ...headerProps } = header;

  const appendices = content.map((contentFragment, i) => {
    switch (contentFragment.type) {
      case 'scene':
        const sceneProps = Object.keys(contentFragment.parsed.parameters || {}).reduce((memo, param) => {
          memo[param] = {
            type: 'value',
            value: contentFragment.parsed.parameters[param]
          }
          return memo;
        }, {
          data: {
            type: 'expression',
            value: `{ ${Object.keys(header.data).map(k => { return `${k}:${k}` }).join(', ')} }`
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

      const controlNames = Object.keys(contentFragment.parsed.controls || {}).map(k => {
        const { range, set } = contentFragment.parsed.controls[k];
        if (!range && !set) {
          return false;
        }

        return k;
      }).filter(d => d);

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
                    {
                      id: id++,
                      type: 'component',
                      name: 'div',
                      properties: {
                        className: {
                          value: 'appendix-graphic-plex',
                          type: 'value'
                        },
                        style: {
                          type: 'expression',
                          value: `{
                            display: 'grid',
                            gridTemplateColumns: '${_range(0, Math.min(4, Object.keys(contentFragment.parsed.controls || {}).map(k => {
                              const { range, set } = contentFragment.parsed.controls[k];
                              let values;
                              if (range) {
                                values = _range(range[0], range[1], range[2]);
                              } else if (set) {
                                values = set;
                              } else {
                                return false;
                              }
                              return values
                            }).filter(d => d).reduce((memo, v) => memo * v.length, 1)) - 1).map(v => '1fr').join(' ')}'
                          }`
                        }
                      },
                      children: cartesian(Object.keys(contentFragment.parsed.controls || {}).map(k => {
                          const { range, set } = contentFragment.parsed.controls[k];

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
                                }))
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
                        }, []).filter(d => d)
                    }]
                  }]
                }]
              }
            ]
          }
        ]
      }

    return appendix;
    }
  }).filter(d => d)


  const ast = {
    id: id++,
    type: 'component',
    name: 'root',
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
    }) : []).concat(content.map((contentFragment) => {
      switch(contentFragment.type) {
        case 'text':
          return {
            id: id++,
            type: 'component',
            name: 'TextContainer',
            children: contentFragment.text.trim().split(/\n\n+/).map((t => {
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
            }))
          }
        case 'scene':
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
              }) : []).concat(contentFragment.stages.reduce((arr, stage) => {
                arr.push({
                  id: id++,
                  type: 'component',
                  name: 'Graphic',
                  children: [
                    {
                      id: id++,
                      type: 'component',
                      name: contentFragment.parsed.graphic,
                      properties: Object.keys(stage.parsed.parameters || {}).reduce((memo, param) => {
                        memo[param] = {
                          type: 'value',
                          value: stage.parsed.parameters[param]
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
                return arr;
            }, []))
          }
        case 'stage':
          console.warn('Found stage at the top level. {stage} should only be used after {scene} has been introduced.');
        default:
          console.warn('Unrecognized type', contentFragment.type, '... ignoring.');
      }
    })).concat(appendices)
  };


  return ast;

}

