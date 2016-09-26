var spawn = require('child_process').spawn;
var express = require('express');
var bodyParser = require('body-parser');

module.exports = function(func, options) {
    options = options || {};

    var app = express();
    app.use(bodyParser.json());
    app.set('env', options.env || 'production');

    app.post('/', function(req, res) {
        var sse = function(key, data) {
            res.write(key + ': ' + JSON.stringify(data) + '\n\n');
        };

        func(req, res, function(command, args, options) {
            var proc = spawn(command, args, options);

            proc.on('error', function(err) {
                console.log(command, args, options, err);
                res.end('spawn failed\n');
            });

            proc.stdout.on('data', function(data) {
                sse('stdout', data.toString());
            });

            proc.stderr.on('data', function(data) {
                sse('stderr', data.toString());
            });

            proc.on('close', function(code) {
                sse('exit', code);
                res.end();
            });
        });
    });

    return app;
};
