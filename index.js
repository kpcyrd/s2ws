var spawn = require('child_process').spawn;
var http = require('http');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var WebSocketServer = require('websocket').server;
var WebSocketClient = require('websocket').client;
var Etcd = require('node-etcd');
var shuffle = require('shuffle-array');

var server = function(func, options) {
    var server = http.createServer(function(req, res) {
        res.writeHead(404);
        res.end();
    });

    wsServer = new WebSocketServer({
        httpServer: server
    });

    wsServer.on('request', function(req) {
        var initialized = false;

        try {
            var sock = req.accept();
        } catch(e) {
            return console.error(e.toString());
        }

        var send = function(key, value) {
            sock.sendUTF(JSON.stringify({
                key: key,
                value: value
            }));
        };

        sock.on('message', function(msg) {
            if(initialized) return;
            initialized = true;

            var body = JSON.parse(msg.utf8Data);
            func(body, function(command, args, options) {
                var proc = spawn(command, args, options);

                proc.on('error', function(err) {
                    console.log(command, args, options, err);
                    send('error', 'spawn failed');
                });

                proc.stdout.on('data', function(data) {
                    send('stdout', data.toString());
                });

                proc.stderr.on('data', function(data) {
                    send('stderr', data.toString());
                });

                proc.on('close', function(code) {
                    send('exit', code);
                    sock.close();
                });
            }, function(errors) {
                 send('error', errors);
                 sock.close();
            });
        });
    });

    return server;
};

var Client = function() {
    EventEmitter.call(this);
    var self = this;

    var client = new WebSocketClient();
    this.client = client;

    client.on('connectionFailed', function(err) {
        self.emit('error', err);
    });

    client.on('connect', function(sock) {
        self.sock = sock;

        sock.on('message', function(msg) {
            var obj = JSON.parse(msg.utf8Data);
            self.emit(obj.key, obj.value);
        });

        self.emit('connect');
    });
};
util.inherits(Client, EventEmitter);

Client.prototype.connect = function(remote) {
    this.client.connect(remote);
};

Client.prototype.spawn = function(body) {
    this.sock.send(JSON.stringify(body));
};

var publish = function(etcdEndpoint, name, selfEndpoint, options) {
    if(!etcdEndpoint) throw new Exception('no etcdEndpoint');
    if(!name) throw new Exception('no name');
    if(!selfEndpoint) throw new Exception('no selfEndpoint');

    options = options || {};
    var ttl = options['ttl'] || 10;

    var etcd = new Etcd(etcdEndpoint.replace(/\/$/, ''));

    var cleanSelfEndpoint = selfEndpoint.replace(/.*\//, '');

    var publish = function() {
        etcd.set('/s2ws/' + name + '/' + cleanSelfEndpoint,
                 selfEndpoint,
                 { ttl: ttl },
                 function() {});
    };

    setInterval(publish, ttl / 2 * 1000);
    publish();
};

var discover = function(etcdEndpoint, name, cb) {
    if(!etcdEndpoint) throw new Exception('no etcdEndpoint');
    if(!name) throw new Exception('no name');

    var etcd = new Etcd(etcdEndpoint.replace(/\/$/, ''));

    etcd.get('/s2ws/' + name, function(error, obj) {
        var nodes = obj.node.nodes;

        shuffle(nodes);

        var first = nodes[0] || {};
        cb(first.value);
    });
};

module.exports = {
    server: server,
    Client: Client,
    publish: publish,
    discover: discover,
};
