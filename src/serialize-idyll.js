
const AST = require('idyll-ast');

const targetMap = {
  video: 'presentation'
}

const serializeIdyll = (target, header, content, gifMap) => {
  try {
    const f = require(`./targets/${targetMap[target] || target}`);
    const ast = f(header, content, gifMap);
    return AST.toMarkup(ast, { insertFullWidth: true });
  } catch(e) {
    console.warn('Encountered error serializing output');
    console.error(e);
  }
  return '';
}

module.exports = serializeIdyll;

