
const AST = require('idyll-ast');

module.exports = (header, content) => {
  let id = 0;

  const paramToVar = (param, idx) => {
    return `scene_${idx}_${param}`;
  }

  let sceneIdxVars = 0;
  let sceneIdxContent = 0;
  
  const ast = {
    id: id++,
    type: 'component',
    name: 'root',
    children: [
      {
        id: id++,
        type: 'component',
        name: 'Header',
        properties: Object.keys(header).reduce((memo, key) => {
          // TODO - maybe need to handle arrays, multiple authors here
          memo[key] = {
              type: 'value',
              value: header[key]
          }
          return memo;
        }, {})
      }
    ].concat(content.reduce((memo, contentFragment) => {
      switch(contentFragment.type) {
        case 'scene':
          // console.log(contentFragment)
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
    }, [])).concat(content.map((contentFragment) => {
      // console.log('mapping', contentFragment)
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
            name: 'Scroller',
            children: [
              {
                id: id++,
                type: 'component',
                name: 'Graphic',
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
                    }, {})
                    // parameters: TODO
                  }
                ]
              }
            ].concat(contentFragment.foreward ? [{
              id: id++,
              type: 'component',
              name: 'Step',
              children: contentFragment.foreward.trim().split(/\n\n+/).map(t => {
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
            }] : []).concat(contentFragment.stages.map(stage => {
              return {
                id: id++,
                type: 'component',
                name: 'Step',
                children: stage.text.trim().split(/\n\n+/).map(t => {
                  return {
                    id: id++,
                    type: 'component',
                    name: 'p',
                    properties: {
                      onEnterViewFully: {
                        type: 'expression',
                        value: Object.keys(stage.parsed.parameters).map(k => `${paramToVar(k, sceneIdxContent - 1)} = ${stage.parsed.parameters[k]}`).join(';')
                      }
                    },
                    children: [
                      {
                        id: id++,
                        type: 'textnode',
                        value: t
                      }
                    ]
                  }
                })
              }
            }))
          }
        case 'stage':
          console.warn('Found stage at the top level. {stage} should only be used after {scene} has been introduced.');
        default:
          console.warn('Unrecognized type', contentFragment.type, '... ignoring.');
      }
    }))
        // {
        // id: 2,
        // type: 'component',
        // name: 'textContainer',
        // children: [
        //     {
        //     id: 2,
        //     type: 'component',
        //     name: 'p',
        //     children: [
        //         {
        //         id: 3,
        //         type: 'textnode',
        //         value: 'This is the first paragraph'
        //         }
        //     ]
        //     },
        //     ]
        // }
  };

  // console.log(JSON.stringify(ast, null, 2));
  return AST.toMarkup(ast, { insertFullWidth: true });
}
