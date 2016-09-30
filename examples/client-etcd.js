var s2ws = require('..');
var client = new s2ws.Client();

client.on('connect', function() {
    client.spawn({
        url: 'https://github.com'
    });
});

client.on('error', function(err) {
    console.log('error', err);
});

client.on('stdout', function(data) {
    console.log('stdout', JSON.stringify(data));
});

client.on('stderr', function(data) {
    console.log('stderr', JSON.stringify(data));
});

client.on('exit', function(code) {
    console.log('exit', code);
});

s2ws.discover(process.env['ETCD_ENDPOINT'], 'example', function(value) {
    client.connect(value);
});
