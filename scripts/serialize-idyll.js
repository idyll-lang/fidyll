
const serializeStatic = require('./targets/static');
const serializeStepper = require('./targets/stepper');
const serializeSlideshow = require('./targets/slideshow');
const serializeScroller = require('./targets/scroller');


const serializeIdyll = (target, header, content) => {
  switch(target) {
    case 'scroller':
      return serializeScroller(header, content);
    case 'stepper':
      return serializeStepper(header, content);
    case 'slideshow':
      return serializeSlideshow(header, content);
    case 'static':
      return serializeStatic(header, content);
    default:
      return '';
  }
}

module.exports = serializeIdyll;

