
const AST = require('idyll-ast');

module.exports = (header, content) => {


  let id = 0;

  const paramToVar = (param, idx) => {
    return `scene_${idx}_${param}`;
  }

  let sceneIdxVars = 0;
  let sceneIdxContent = 0;
 
  let sceneStartIndex = 1, sceneEndIndex = -1;
  
  const ast = {
    id: id++,
    type: 'component',
    name: 'root',
    children: [
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
        name: "VideoStepper",
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
                    }, {})
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
              properties: Object.keys(header).reduce((memo, key) => {
                // TODO - maybe need to handle arrays, multiple authors here
                memo[key] = {
                    type: 'value',
                    value: header[key]
                }
                return memo;
              }, {})
            }
          ]
        }].concat(content.reduce((memo, contentFragment) => {
          switch(contentFragment.type) {
            case 'scene':
              
              contentFragment.stages.forEach(stage => {
                memo.push({
                  id: id++,
                  type: 'component',
                  name: 'Slide',
                  children: stage.text.trim().split(/\n\n+/).map(t => {
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

          }
          return memo;
        
        }, []))
      }]
    }

  // console.log(JSON.stringify(ast, null, 2));
  return ast;
}
