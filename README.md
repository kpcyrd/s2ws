# spawn2sse
Expose spawn to Server Sent Events

## Example
```
var spawn2sse = require('spawn2sse');

var app = spawn2sse(function(req, res, func) {
    var url = req.body.url;

    if(!url) {
        return res.end('no url');
    }

    func('curl', ['--', url]);
});

app.listen(3000);
```
