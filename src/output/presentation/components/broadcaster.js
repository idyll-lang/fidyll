const React = require('react');
const Peer = require('peerjs');

class Broadcaster extends React.Component {

  constructor() {
    this.state = {
      isPresenting: false
    }

    this.peer = null;
  }

  componentDidMount() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());

    if (params.presenting) {
      this.setState({
        isPresenting: true
      })

      this.peer = new Peer(this.props.peerkey); 
      this.peer.on('connection', (conn) => {
          this._conn = conn;
        conn.on('open', () => {
          conn.send('hello!');
        });
      });
    } else {
      this.peer = new Peer();     
      this.conn = this.peer.connect(this.props.peerkey);

      this.conn.on('data', (data) => {
        // Will print 'hi!'
        console.log('audience received data');
        console.log(data);
      });
    }
  }

  handleSend() {
    this._conn.send('hello world yeah!');
  }

  render() {

    if (!this.state.isPresenting) {
      return null;
    }

    const { hasError, idyll, updateProps, ...props } = this.props;
    return (<div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    }}>
        Presenter view

        <button onClick={() => this.handleSend}>

        </button>
    
    </div>)
  }
}

module.exports = Broadcaster;
