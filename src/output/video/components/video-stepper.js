const React = require('react');

class VideoStepper extends React.Component {

  componentDidMount() {
    const update = () => {
      let currentIndex = this.props.index;
      if (currentIndex < this.props.length - 1) {
        this.props.updateProps({
          index: currentIndex + 1
        })
        setTimeout(update, 1000);
      }
    }

    setTimeout(update, 1000);
  }

  render() {
    return null;
  }
}

module.exports = VideoStepper;
