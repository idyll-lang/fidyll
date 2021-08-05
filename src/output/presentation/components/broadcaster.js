const React = require('react');
var load = require("little-loader");


class Broadcaster extends React.Component {

    constructor(props) {
      super(props);
      this.state = {
        isPresenting: false
      }

      this.peer = null;
      this.audience = [];
    }

    componentDidMount() {
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());

      console.log('mount');
      load("https://unpkg.com/peerjs@1.3.1/dist/peerjs.min.js", (err) => {
        if (err) {
          console.log('error loading peer');
        }
        if (params.presenting) {
          this.setState({
            isPresenting: true
          })

          this.peer = new Peer(this.props.peerkey);
          this.peer.on('open', function(id) {
            // console.log('My peer ID is: ' + id);
          });
          this.peer.on('connection', (conn) => {
            this._conn = conn;
            conn.on('open', () => {
              this.audience.push(conn);
            });
          });
        } else {
          this.peer = new Peer();
          this.peer.on('open', (id) => {
            this.conn = this.peer.connect(this.props.peerkey);
            this.conn.on('open', () => {
              // here you have conn.id
              this.conn.send('hi!');
            });
            this.conn.on('data', (data) => {
                this.props.updateProps(data);
            });
          });
        }
      });

    }

    emitUpdate(obj) {
      if (!this.state.isPresenting) {
          return;
      }
      try {
          console.log('emmitting', obj);
        this.audience.forEach(conn => {
            conn.send(obj);
        })
        this.props.updateProps(obj);
      } catch (e) {
        console.warn(e);
      }
    }

    componentDidUpdate(oldProps) {
        const { __slideshowIndex, __slideshowLength, peerkey, idyll, hasError, error, children, updateProps, ...rest } = this.props;

        const newProps = {};
        Object.keys(rest).forEach(k => {
            if (oldProps[k] !== rest[k]) {
                newProps[k] = rest[k];
            }
        })
        this.emitUpdate(newProps);
    }


    render() {

      if (!this.state.isPresenting) {
        return null;
      }

      const {
        hasError,
        idyll,
        updateProps,
        ...props
      } = this.props;

      return (<div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: '#ddd'
      }}>  
          <div>
                {props.__slideshowIndex} / {props.__slideshowLength}
          </div>
          <div>
              {props.children}
          </div>
          <button onClick={() => this.emitUpdate({ __slideshowIndex: Math.max(0, (props.__slideshowIndex - 1)) })}>
              Previous
          </button>
          <button onClick={() => this.emitUpdate({ __slideshowIndex: (props.__slideshowIndex + 1) % props.__slideshowLength })}>
              Next
          </button>
      </div>)

    }
}

module.exports = Broadcaster;
