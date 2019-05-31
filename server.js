var express = require("express");
var path = require("path");
var session = require('express-session');
var app = express();
var bodyParser = require('body-parser');
var server = app.listen(8000)
var io = require('socket.io')(server);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "./static")));
app.use(session({
    secret: 'daringdoge',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 100000 }
}))
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

app.get('/', function(req,res) {
    res.render('index')
})

var allQuestions = [
    "Say the name of your favorite movie.",
    "Say the name of the player that you think is the best at videogames.",
    "Say the name of the player to your left.",
    "Stand up if you're the oldest player.",
    "Name a music artist or band that starts with a vowel",
    "Tell the other players what the last thing you've eaten was?",
    "Give a compliment to the player to your left.",
    "Start singing any Britney Spears song.",
    "Point at the player that has the worst jokes",
    "Say this out loud: I'm the Fake player!",
    "Say the name of the player who would least likely survive in a deserted island.",
    "Start laughing.",
    "Start clapping until the timer ends.",
    "Whisper your name to the person next to you."
]

var allClients = [];
var players = {
    player1 : {
        name: "",
        id: "",
        indexNumber: 0,
        score: 0,
        fake: false,
    },
    player2 : {
        name: "",
        id: "",
        indexNumber: 1,
        score: 0,
        fake: false,
    },
    player3 : {
        name: "",
        id: "",
        indexNumber: 2,
        score: 0,
        fake: false,
    },
    player4 : {
        name: "",
        id: "",
        indexNumber: 3,
        score: 0,
        fake: false,
    },
}
var numClients = 0;

var count = 0

io.on('connection', function (socket) {
    allClients.push(socket);
    socket.on('new_user', function (data) {
        if (allClients.length == 1) {
            players.player1.id = socket.id
            players.player1.name = data.name
            console.log(players.player1.id)
            console.log("player1's name is " + players.player1.name)
        }
        if (allClients.length == 2) {
            players.player2.id = socket.id
            players.player2.name = data.name
            console.log("player2's name is " + players.player2.name)
        }
        if (allClients.length == 3) {
            players.player3.id = socket.id
            players.player3.name = data.name
            console.log("player3's name is " + players.player3.name)
        }
        if (allClients.length == 4) {
            players.player4.id = socket.id
            players.player4.name = data.name
            console.log("player4's name is" , players.player4.name)
        }
        io.emit('hello_user', {user: data.name})
        numClients = socket.server.engine.clientsCount
        console.log('numClients is now', numClients)

        io.emit('playerCount', {playerCount: numClients})
        if( numClients == 4 ) {
            var randomProperty = function (players) {
                // console.log("inside Random function", players)
                var result;
                var keys = Object.keys(players)
                var faker = keys[ keys.length * Math.random() << 0];
                return faker
            }
            faker = randomProperty(players);
            console.log("faker is", faker);
            console.log(players[faker])
            io.emit('showFakeButton', {each : players});
            // io.emit('showFake', faker );
        }
    });

    socket.on('refreshFake', function () {
        count ++
        if ( count == 4 ) {
            var randomProperty = function (players) {
                var result;
                var keys = Object.keys(players)
                var faker = keys[ keys.length * Math.random() << 0];
                return faker
            }
            faker = randomProperty(players);
            console.log("faker is", faker);
            console.log(players[faker])
            io.emit('showFakeButton', {each : players});
            count = 0;
        }
    })

    socket.on('amIaFake', function(id) {
        console.log('in the fake check')
        console.log(id)
        console.log(players[faker].id)
        if (id.id == players[faker].id) {
            io.to(socket.id).emit('fakeMessage', `Shhh...you ARE the Fake. Try your best to blend in when the time comes!`);
        } else {
            io.to(socket.id).emit('realMessage', `You are NOT the Fake. Get ready to complete the prompt!`);
        }
    })

    socket.on('startTrigger', function () {
        if (socket.playerNum == 4) {
            socket.emit('gameStart')
        }
    })
    socket.on('disconnect', function() {
        console.log(`${socket.id} got disconnected`);
        console.log(`There are now ${socket.server.engine.clientsCount} people connected`)
        let numClients = socket.server.engine.clientsCount;
        var i = allClients.indexOf(socket);
        allClients.splice(i, 1);
        io.emit('user_disconnect', {user: socket.id, players: numClients})
    });

    socket.on('new_message', function (data) {
        io.emit('sent_message', {message:data.message, user: socket.id})
    })

    socket.on('getQuestions', function () {
        var ri = Math.floor(Math.random() * allQuestions.length);
        var result = allQuestions[ri];
        console.log(result)
        io.emit('sendQuestion', {question: result, fake: players[faker].id});
        allQuestions.splice(ri, 1);
        console.log("ALL", allQuestions)
    })

    socket.on('count', function () {
        count ++
        console.log(count)
        if (count == 4) {
            io.emit('showBeginButton')
            count = 0
        }
    })

    socket.on('getForm', function () {
        console.log(socket.id)
        console.log(players)
        io.to(socket.id).emit('showForm', {players: players, fake: players[faker].id});
        })

    socket.on('addToScore', function (data) {
        if (players[data.players] == players[faker]) {
            console.log("add to score to", socket.id)
            if(players.player1.id == socket.id) {
                players.player1.score += 1
                console.log("player 1 gets a point")
                socket.emit('updateScoreboard', {currentScore: players})
                if (players.player1.score >= 8) {
                    io.emit('gameOver', {currentScore: players, winner: players.player1})
                }
            }
            else if(players.player2.id == socket.id) {
                players.player2.score += 1
                console.log("player 2 gets a point")
                socket.emit('updateScoreboard', {currentScore: players})
                if (players.player2.score >= 8) {
                    io.emit('gameOver', {currentScore: players, winner: players.player2})
                }
            }
            else if(players.player3.id == socket.id) {
                players.player3.score += 1
                console.log("player 3 gets a point")
                socket.emit('updateScoreboard', {currentScore: players})
                if (players.player3.score >= 8) {
                    io.emit('gameOver', {currentScore: players, winner: players.player3})
                }
            }
            else if(players.player4.id == socket.id) {
                players.player4.score += 1
                console.log("player 4 gets a point")
                socket.emit('updateScoreboard', {currentScore: players})
                if (players.player4.score >= 8) {
                    io.emit('gameOver', {currentScore: players, winner: players.player4})
                }
            }
            socket.emit('nextRound')
            console.log("----------------------------NEW SCORE----------------------------", players)
        }
        if (players[data.players] != players[faker]) {
            players[faker].score +=1
            console.log("----------------------------Faker got points-------------------------", players[faker])
            if (players[faker].score >= 8) {
                io.emit('gameOverFake', {currentScore: players, winner: players[faker]})
            }
        }
        count ++
        if (count == 3) {
            io.emit('showNextRoundButton', {currentFake: players[faker].name, currentScore: players})
            count = 0
        }
    })

    socket.on('reset', function () {
        allQuestions = [
            "Say the name of your favorite movie.",
            "Say the name of the player that you think is the best at videogames.",
            "Say the name of the player to your left.",
            "Stand up if you're the oldest player.",
            "Name a music artist or band that starts with a vowel",
            "Tell the other players what the last thing you've eaten was?",
            "Give a compliment to the player to your left.",
            "Start singing any Britney Spears song.",
            "Point at the player that has the worst jokes",
            "Say this out loud: I'm the Fake player!",
            "Say the name of the player who would least likely survive in a deserted island.",
            "Start laughing.",
            "Start clapping until the timer ends.",
            "Whisper your name to the person next to you."
        ]
        players.player1.score = 0;
        players.player2.score = 0;
        players.player3.score = 0;
        players.player4.score = 0;
        io.emit('zero', {currentScore: players})
    })
});