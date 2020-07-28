var express = require("express");
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var path = require("path");
var os = require('os');
const cors = require("cors");
const port = process.env.PORT || 8010;

app.use(cors());

var allClients = [];
var users = {};

io.on('connection', function (socket) {
    console.log('user connected...');
    // allClients.push(socket.id);
    // console.log("list of connected users");
    // console.log(allClients);    

    //when server gets a message from a connected user 
    socket.on('message', function (message) {

        var data;

        //accepting only JSON messages 
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.log("Invalid JSON");
            data = {};
        }

        //switching type of the user message 
        switch (data.type) {
            //when a user tries to login
            case "login":
                console.log("User logged", data.name);

                //if anyone is logged in with this username then refuse 
                if (users[data.name]) {
                    sendTo(socket, {
                        type: "login",
                        success: false
                    });
                } else {
                    //save user connection on the server 
                    users[data.name] = socket;
                    socket.name = data.name;

                    sendTo(socket, {
                        type: "login",
                        success: true
                    });
                }

                break;

            case "offer":
                //for ex. UserA wants to call UserB 
                console.log("Sending offer to: ", data.name);

                //if UserB exists then send him offer details 
                var conn = users[data.name];

                if (conn != null) {
                    //setting that UserA connected with UserB 
                    socket.otherName = data.name;

                    sendTo(conn, {
                        type: "offer",
                        offer: data.offer,
                        name: socket.name
                    });
                }

                break;

            case "answer":
                console.log("Sending answer to: ", data.name);
                //for ex. UserB answers UserA 
                var conn = users[data.name];

                if (conn != null) {
                    socket.otherName = data.name;
                    sendTo(conn, {
                        type: "answer",
                        answer: data.answer
                    });
                }

                break;

            case "candidate":
                console.log("Sending candidate to:", data.name);
                var conn = users[data.name];

                if (conn != null) {
                    sendTo(conn, {
                        type: "candidate",
                        candidate: data.candidate
                    });
                }

                break;

            case "leave":
                console.log("Disconnecting from", data.name);
                var conn = users[data.name];
                if(conn && conn.otherName){
                    conn.otherName = null;
                }
                

                //notify the other user so he can disconnect his peer connection 
                if (conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }

                break;

            default:
                sendTo(socket, {
                    type: "error",
                    message: "Command not found: " + data.type
                });

                break;
        }

    });

    //when user exits, for example closes a browser window 
    //this may help if we are still in "offer","answer" or "candidate" state 
    // socket.on("close", function () {

    //     if (socket.name) {
    //         delete users[socket.name];

    //         if (socket.otherName) {
    //             console.log("Disconnecting from ", socket.otherName);
    //             var conn = users[socket.otherName];
    //             conn.otherName = null;

    //             if (conn != null) {
    //                 sendTo(conn, {
    //                     type: "leave"
    //                 });
    //             }
    //         }
    //     }

    // });

    // socket.send("Hello world");

    socket.on('disconnect', function () {
        if (socket.name) {
            delete users[socket.name];

            if (socket.otherName) {
                console.log("Disconnecting from ", socket.otherName);
                var conn = users[socket.otherName];
                conn.otherName = null;

                if (conn != null) {
                    sendTo(conn, {
                        type: "leave"
                    });
                }
            }
        }
        // console.log('Got disconnect!');

        // var i = allClients.indexOf(socket);
        // allClients.splice(i, 1);
        // console.log("list of connected users");
        // console.log(allClients);
    });
});

function sendTo(socket, message) {
    socket.send(JSON.stringify(message));
    // socket.emit('message', JSON.stringify(message));
}

app.use(express.static(__dirname + '/node_modules'));

app.get('/', function (req, res) {
    // res.send('server is up and running')
    res.sendFile(path.join(__dirname + '/index.html'));
    //__dirname : It will resolve to your project folder.
});

server.listen(port, function () {
    console.log("server is listning on port: " + port);
});