const React = require('react');
var load = require("little-loader");


class Broadcaster extends React.Component {

    constructor(props) {
      super(props);
      this.state = {
        isPresenting: false,
        emitState: {}
      }

      this.peer = null;
      this.audience = [];
    }

    componentDidMount() {
      const urlSearchParams = new URLSearchParams(window.location.search);
      const params = Object.fromEntries(urlSearchParams.entries());

      if (!params.live || params.live === 'false' || params.live === 0) {
        return
      }

      console.log('mount');
      load("https://unpkg.com/peerjs@1.3.1/dist/peerjs.min.js", (err) => {
        if (err) {
          console.log('error loading peer');
        }
        if (params.presenting) {
          this.setState({
            isPresenting: true
          })

          this.peer = new Peer(`${this.props.peerkey}-${params.room}`);
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
            this.conn = this.peer.connect(`${this.props.peerkey}-${params.room}`);
            this.conn.on('open', () => {
              // here you have conn.id
              this.conn.send('hi!');
            });
            this.conn.on('data', (data) => {
                const { __slideshowIndex, ...hudData } = data;
                this.setState({
                  emitState: {
                    ...this.state.emitState,
                    ...Object.fromEntries(Object.keys(hudData).map((k) => {
                      return [k, {
                        time: +(new Date()),
                        value: hudData[k]
                      }]
                    }))
                  }
                })

                setTimeout(() => {
                  this.setState({ emitState: { ...this.state.emitState } })
                }, 5000)

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
        const emitData = Object.keys(this.state.emitState).filter((k) => {
          return ((this.state.emitState[k].time + 5 * 1000) > +(new Date()))
        });

        if (emitData.length) {
          return <div style={{ position: 'fixed', bottom: '1em', left: '1em', background: '#333', color: '#fff', padding: '0.5em', fontSize: 12 }}>
            {emitData.map((k) => {
              const value = this.state.emitState[k].value;
              return <div key={k}>{k.replace(/scene\_\d+\_/g, '')} = {value}</div>
            })}
          </div>
        }
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
          background: '#ddd',
          padding: '1em'
      }}>
          <div>
                {props.__slideshowIndex + 1} / {props.__slideshowLength}
          </div>
          <div style={{display: 'flex', flexDirection: 'row'}}>
            <button onClick={() => this.emitUpdate({ __slideshowIndex: Math.max(0, (props.__slideshowIndex - 1)) })}>
                Previous
            </button>
            <button onClick={() => this.emitUpdate({ __slideshowIndex: (props.__slideshowIndex + 1) % props.__slideshowLength })}>
                Next
            </button>
          </div>
          <div>
              {props.children}
          </div>
      </div>)

    }
}

module.exports = Broadcaster;
