const React = require('react');

class VideoStepper extends React.Component {

  componentDidMount() {
    window.status = "ready";

    window._setSlide = (_slideIndex) => {
      this.props.updateProps({
        index: _slideIndex
      });
    }

    window.startMovie = () => {
      console.log('stepper did mount', this.props.index, this.props.length);
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());
      console.log('slideTiming', params['slideTiming']);

      const timings = (params['slideTiming'] || '').split(',').map(d => +d);

      console.log(timings);

      const update = () => {
        let currentIndex = this.props.index;
        console.log('updating', currentIndex);
        if (currentIndex < this.props.length - 1) {
          console.log('did update!!');
          this.props.updateProps({
            index: currentIndex + 1
          })
          console.log('setTimeout', currentIndex, timings[currentIndex + 1] || 1000);
          setTimeout(update, +(timings[currentIndex + 1] || 1000));
        } else {
          console.log('did not update');
        }
      }

      console.log('setTimeout', timings[0] || 1000);
      setTimeout(update, +(timings[0] || 1000));
    }
  }

  render() {
    return null;
  }
}

module.exports = VideoStepper;
