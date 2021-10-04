const React = require('react');

class SlideIndex extends React.Component {

  render() {
    return <div style={{ position: 'fixed', right: '1em', bottom: '1em' }}>
      <span style={{fontWeight: 'bold'}}>{this.props.index+1}</span> / {this.props.length}
    </div>;
  }
}

module.exports = SlideIndex;
