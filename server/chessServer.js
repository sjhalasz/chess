Sessions.allow({
  "insert": function(){return true;}, 
});

Meteor.publish("sessions", function() {
  return Sessions.find({}, {fields: {"secretId": 0}});
});

Meteor.publish("games", function(sessionId) {
  return Games.find(
    {$and: [
      {"active": true}, 
      {$or: [
        {"white": sessionId}, 
        {"black": sessionId}
      ]}
    ]}
  );
});

// heartbeat method; also records current user for this session
Meteor.methods({
  "heartbeat": function (sessionId, secretId) {
    var user = Meteor.user();
    user = user ? user.username : ""
    var lastSeen = (new Date()).getTime();
    var session = Sessions.findOne(sessionId);
    if(session && secretId == session.secretId) {
      if(session.user != user) { // user has changed; do what?
      
      }
      Sessions.update(
        sessionId, 
        {$set: {
          lastSeen: lastSeen,
          user: user
        }}
      );
    //console.log("heartbeat " + secretId + " " + user + " " + lastSeen);
    }
  },
  // offer a game to another user
  // if the other user has offered back, start the game
  // to revoke, call this with null
  "offer": function(sessionId, secretId, otherId) {
    var user = Meteor.user();
    user = user ? user.username : "";
    var session = Sessions.findOne(sessionId);
    if(session && secretId == session.secretId) {
      Offers.remove({"sessionId": sessionId}); // remove any previous offers by me
      // first see if the other user has an offer to me;
      // if so, start the game
      var pair = Offers.findOne({"sessionId": otherId, "otherId": sessionId});
      var gameId = null;
      if(pair) { // yes we have a match, begin play
        Offers.remove(pair._id); // remove partner's offer
        var white, wname, black, bname;
        if(0 == Math.floor(2 * Math.random())) { 
          white = sessionId; 
          wname = user; 
          black = pair.sessionId; 
          bname = pair.user;
        } else {
          white = pair.sessionId;
          wname = pair.user; 
          black = sessionId;
          bname = user;
        }
        var chess = new Chess();
        chess.header("White", wname, "Black", bname);
        gameId = Games.insert({
          "active": true,
          "white": white,
          "wname": wname,
          "black": black,
          "bname": bname,
          "turn" : white,
          "fen"  : chess.fen(),
          "pgn"  : chess.pgn(),
          "ascii": chess.ascii(),
          "wtime": 7 * 60,
          "btime": 7 * 60,
          "ctime": (new Date()).getTime()
        });
      } else {
        Offers.insert({
          sessionId: sessionId,
          user: user,
          otherId: otherId
        });
      }
      Sessions.update(
        sessionId, 
        {$set: {
          gameId: gameId
        }},
        function(err, cnt) {
          //console.log("set gameid " + cnt);
        }
      );
      Sessions.update(
        otherId, 
        {$set: {
          gameId: gameId
        }},
        function(err, cnt) {
          //console.log("set gameid " + cnt);
        }
      );
    } // end of if
  },
  "move": function(sessionId, secretId, move){
    // validate that session_id and user match for gameId, and that from, to is valid for this game
    // then update ChessGames for this gameId
    var session = Sessions.findOne(sessionId);
    if(session && secretId == session.secretId) {
      var game = Games.findOne(session.gameId);
      var chess = new Chess(game.fen);
      var next = game.turn == game.white ? game.black : game.white;
      if(chess.move(move)) {
        Games.update(
          game._id,
          {$set: {
            "fen"  : chess.fen(),
            "pgn"  : chess.pgn(),
            "ascii": chess.ascii(),
            "turn" : next,
            "message": ""
          }},
          function(err, cnt) {
            //console.log("move " + cnt);
          }
        );
        //console.log("move " + move);
      } else { // invalid move
         Games.update(
           game._id,
           {$set: {
             "message": "Invalid move."
           }}
         );
         console.log("message " + "Invalid Move.");
      }
    }
  },
  "resign": function(session_id, gameId){
    // validate session_id for gameId, and if valid, resign this user for this game
  }
});

// clean up dead sessions after 6 seconds
Meteor.setInterval(
  function () {
    var now = (new Date()).getTime();
    Sessions.find({
      "lastSeen": {$lt: (now - 6 * 1000)}
    }).forEach(
      function (session) {
        // deactivate idle session
        console.log("removing session " + session.secretId);
        Sessions.remove(session._id);
    }); 
  }, // end of setInterval function argument
  3000
);



