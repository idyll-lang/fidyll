const React = require('react');
const { filterChildren, mapChildren } = require('idyll-component-children');

class CustomComponent extends React.Component {
  getSlides() {
    return (
      filterChildren(this.props.children || [], c => {
        return c.type.name && c.type.name.toLowerCase() === 'slide';
      }) || []
    );
  }

  componentDidMount() {
    const { currentSlide, tag, children } = this.props;
    const slides = filterChildren(children, c => {
      return c.type.name && c.type.name.toLowerCase() === 'slide';
    });
    this.props.updateProps({
      numSlides: slides.length
    });

    document.onkeydown = e => {
      const { currentSlide, tag, children } = this.props;
      const slides = filterChildren(children, c => {
        return c.type.name && c.type.name.toLowerCase() === 'slide';
      });
      console.log(e);
      switch (e.keyCode) {
        case 37:
          if (currentSlide > 0) {
            e.preventDefault();
            this.props.updateProps({
              currentSlide: currentSlide - 1
            });
          }
          break;
        case 38:
          break;
        case 39:
          if (currentSlide < slides.length - 1) {
            e.preventDefault();
            this.props.updateProps({
              currentSlide: currentSlide + 1
            });
          }
          break;
        case 40:
          break;
      }
    };
  }

  render() {
    const {
      hasError,
      idyll,
      updateProps,
      children,
      currentSlide,
      noTransition,
      ...props
    } = this.props;
    return (
      <div>
        <div className="idyll-slide-graphic">
          {filterChildren(children, c => {
            return c.type.name && c.type.name.toLowerCase() === 'graphic';
          })}
        </div>
        <div
          className="slideshow"
          style={{
            height: '100vh',
            background: '#fff',
            color: '#222',
            position: 'absolute',
            transform: `translateX(${-100 * currentSlide}vw)`,
            transition: noTransition ? 'transform 0s' : null
          }}
        >
          {this.getSlides()}
        </div>
      </div>
    );
  }
}

module.exports = CustomComponent;
