// Client side websocket API exerciser for Greyhound.

(function(w) {
    'use strict';

    // get URL parameters
    var getUrlParameters = function(query) {
        query = query.substring(1);

        var match,
            pl     = /\+/g, // Replace '+' with a space.
            search = /([^&=]+)=?([^&]*)/g,
            decode = function(s) {
                return decodeURIComponent(s.replace(pl, " "));
            },
            urlParams = {};

        while (match = search.exec(query))
           urlParams[decode(match[1])] = decode(match[2]);

        return urlParams;
    };

    // show an error message to the user
    //
    var errorOut = function(msg) {
        $("#messages").html("<p class='error'>" + msg + "</p>");
        console.log('Error : ' + msg);
    };

    // show a status message to the user
    var message = function(msg) {
        $("#messages").html("<p class='message'>" + msg + "</p>");
        console.log('Status: ' + msg);
    };

    // download data over from the server and call the cb when done
    //
    var downloadData = function(setStatus, cb) {
        if (!w.WebSocket)
            return cb(new Error(
                    "Your browser doesn't seem to support websockets"));

        setStatus("Loading Point Cloud Data... Please Wait.");

        // prepare websocket URL and try to create a websocket
        //
        var wsUrl = "ws://" + w.location.host + "/";
        var ws = new w.WebSocket(wsUrl);

        // get data as array buffer
        ws.binaryType = "arraybuffer";
        var pipelineId;

        // Websocket open handler
        // Send a command to create a session, we will initiate an actual read
        // when we get confirmation that the connection was created
        ws.onopen = function() {
            setStatus("WebSocket connection established. Creating session...");

            // var urlParams = getUrlParameters(w.location.search);

            var match = w.location.pathname.match('\/ws\/([^\/]+)');
            pipelineId = match[1];

            if (match)
            {
                ws.send(JSON.stringify({
                    command: 'stats',
                    pipeline: pipelineId
                }));
            }
            else
            {
                setStatus('No pipeline selected!');
                return;
            }
        };

        var count;
        var numPoints;
        var dataBuffer = null;
        var meta = null;
        var stats = null;

        ws.onmessage = function(evt) {
            if (typeof(evt.data) === "string") {
                var msg = JSON.parse(evt.data);
                console.log('Incoming:', msg);

                if (msg.command === "stats") {
                    stats = msg.stats;
                    // console.log(stats.stages['filters.stats']);

                    if (msg.status === 0)
                        return cb(new Error(
                                'Failed to create session, this is not good.'));

                    var readParams = { command: 'read', pipeline: pipelineId };
                    var urlParams = getUrlParameters(w.location.search);

                    for (var key in urlParams) {
                        readParams[key] = JSON.parse(urlParams[key]);
                    }

                    readParams['schema'] =
                    [
                        {
                            "name": "X",
                            "type": "floating",
                            "size": "4"
                        },
                        {
                            "name": "Y",
                            "type": "floating",
                            "size": "4"
                        },
                        {
                            "name": "Z",
                            "type": "floating",
                            "size": "4"
                        },
                        /*
                        {
                            "name": "Intensity",
                            "type": "unsigned",
                            "size": "2"
                        },
                        {
                            "name": "Red",
                            "type": "unsigned",
                            "size": "2"
                        },
                        {
                            "name": "Green",
                            "type": "unsigned",
                            "size": "2"
                        },
                        {
                            "name": "Blue",
                            "type": "unsigned",
                            "size": "2"
                        },
                        */
                    ];

                    // This is in response to our create request.  Now request
                    // to receive the data.
                    ws.send(JSON.stringify(readParams));

                    setStatus("Read initiated, waiting for response...");
                }
                else if (msg.command === "read") {
                    if (msg.status !== 1)
                        return cb(new Error(
                                    "Failed to queue read request: " +
                                    (msg.reason || "Unspecified error")));

                    setStatus("Reading data... Please wait.");

                    console.log(msg.numPoints, msg.numBytes);

                    count       = 0;
                    numPoints   = msg.numPoints;
                    dataBuffer  = new Int8Array(msg.numBytes);

                    if (numPoints == 0) ws.close();
                }
            }
            else {
                var a = new Int8Array(evt.data);
                dataBuffer.set(a, count);

                count += a.length;

                if (count >= dataBuffer.byteLength) {
                    // we're done reading data, close connection
                    ws.close();
                }
            }
        };

        // close and cleanup data
        ws.onclose = function() {
            if(dataBuffer !== null) {
                // Use setTimeout so that we call the callback outside the
                // context of ws.onclose
                setTimeout(function() {
                    cb(null, dataBuffer, numPoints, meta, stats);
                }, 0);
            }
        };
    }

    w.doIt = function() {
        $("#stats").hide();
        downloadData(message, function(err, data, count, meta, stats) {
            if (err)
                return errorOut(err.message);

            console.log(
                'Got',
                data.byteLength,
                'total bytes in',
                count,
                'points');

            message("Data download complete, handing over to renderer.");
            try {
                renderPoints(data, count, meta, message);
            }
            catch(e) {
                errorOut(e.message);
            }
        });
    };
})(window);

$(function() {
    doIt();
});

