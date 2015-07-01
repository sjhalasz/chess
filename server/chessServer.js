Sessions.allow({
  "insert": function(){return true;}, 
});

Meteor.publish("sessions", function() {
  return Sessions.find({}, {fields: {"secretId": 0}});
});

Meteor.publish("games", function(sessionId) {
  return Games.find(
    {$or: [
      {"white": sessionId}, 
      {"black": sessionId}
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
    // console.log("heartbeat " + secretId + " " + user + " " + lastSeen);
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
      var gameId = null;
      var offerTo = null;      
      var offerFrom = null;
      var otherSession = Sessions.findOne(otherId);
      // first see if the other user has an offer to me;
      // if so, start the game
      //var pair = Offers.findOne({"sessionId": otherId, "otherId": sessionId});
      // console.log("other session offer to " + otherSession.offerTo);
      // console.log("my session id          " + sessionId);
      if(otherSession.offerTo == sessionId) { // yes we have a match, begin play
        // remove all my and other's offers
        Sessions.update(
          {offerTo: {$in: [sessionId, otherId]}},
          {$set: {offerTo: null}},
          {multi: true}
        );
        Sessions.update(
          {offerFrom: {$in: [sessionId, otherId]}},
          {$set: {offerFrom: null}},
          {multi: true}
        );
        var white, wname, black, bname;
        if(0 == Math.floor(2 * Math.random())) { 
          white = sessionId; 
          wname = user; 
          black = otherSession._id; 
          bname = otherSession.user;
        } else {
          white = otherSession._id;
          wname = otherSession.user; 
          black = sessionId;
          bname = user;
        }
        var chess = new Chess();
        chess.header("White", wname, "Black", bname);
        gameId = Games.insert({
          "white": white,
          "wname": wname,
          "black": black,
          "bname": bname,
          "turn" : white,
          "fen"  : chess.fen(),
          "ascii": chess.ascii(),
          "wtime": 1000 * 10 * 60,
          "btime": 1000 * 10 * 60,
          "ctime": (new Date()).getTime(),
          "moves": []
        });
      } else {
        offerTo = otherId;
        offerFrom = sessionId;
      }
      Sessions.update(
        sessionId, 
        {$set: {
          gameId: gameId,
          offerTo: offerTo
        }},
        function(err, cnt) {
          // console.log("set gameid " + cnt);
        }
      );
      Sessions.update(
        otherId, 
        {$set: {
          gameId: gameId,
          offerFrom: offerFrom
        }},
        function(err, cnt) {
          // console.log("set gameid " + cnt);
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
      var ctime = (new Date()).getTime();
      var etime = ctime - game.ctime;
      var wtime = game.wtime;
      var btime = game.btime;
      if(game.turn == game.white) {
        wtime = wtime - etime;
      } else {
        btime = btime - etime
      }
      wtime = Math.max(60000, wtime);
      btime = Math.max(60000, btime);
        if(chess.move(move)) {
          var message = "";
          if(chess.in_check()) message = "Check."
          var moves = game.moves;
          moves.push(move);
          var turn = game.turn == game.white ? game.black : game.white;
          Games.update(
            game._id,
            {$set: {
              "fen"  : chess.fen(),
              "ascii": chess.ascii(),
              "turn" : turn,
              "wtime": wtime,
              "btime": btime,
              "ctime": ctime,
              "message": message,
              "moves": moves
            }},
            function(err, cnt) {
              // console.log("move " + cnt);
            }
          );
          // console.log("move " + move);
          if(chess.game_over()) { // if game ended with this move...
            score = "½-½";
            var alert = "Draw due to ";
            if(chess.in_checkmate()) { // side to move is in checkmate
              score = (turn == game.white) ? "0-1" : "1-0";
              alert = ((turn == game.white) ? "White" : "Black") + " is in checkmate."
            }
            else if(chess.in_stalemate()) {
              alert += "stalemate."
            }
            else if(chess.in_threefold_repetition()) {
              alert += "threefold repetition."
            }
            else if(chess.insufficient_material()) {
              alert += "insufficient material."
            }
            else if(chess.in_draw()) { // 50 move rule
              alert += "50 move rule."
            }
            gameEnd(game, score, alert);
          }
        } else { // invalid move
           Games.update(
             game._id,
             {$set: {
               "message": "Invalid move."
             }}
           );
           // console.log("message " + "Invalid Move.");
        } // end of if(chess.move
    } // end of if(session
  },
  "resign": function(sessionId, secretId){
    var session = Sessions.findOne(sessionId);
    if(session && secretId == session.secretId) {
      var game = Games.findOne(session.gameId);
      if(game.turn == game.white) {
        gameEnd(game, "0-1", "White resigns.");
      } else {
        gameEnd(game, "1-0", "Black resigns.");
      }
    }
  },
  "closeGame": function(sessionId, secretId) {
    var session = Sessions.findOne(sessionId);
    if(session && secretId == session.secretId) {
      var game = Games.findOne(session.gameId);
      if(sessionId == game.white) {
        Games.update(
          session.gameId,
          {$set: {white: 0}}
        );
      } else {
        Games.update(
          session.gameId,
          {$set: {black: 0}}
        );
      }
    }
  }
});

var gameEnd = function(game, score, message) {
  Games.update(
    game._id,
    {$set: {
      "score": score,
      "endMessage": message
    }},
    function(err, cnt) {
      // console.log("gameEnd " + cnt);
    }
  );
};

// clean up dead sessions after 5 seconds
Meteor.setInterval(
  function () {
    var now = (new Date()).getTime();
    Sessions.find({
      "lastSeen": {$lt: (now - 5 * 1000)}
    }).forEach(
      function (session) {
        // deactivate idle session
        // console.log("removing session " + session.secretId);
        var game = Games.findOne(session.gameId);
        if(game)
          gameEnd(game, "", "Opponent's connection was lost.");
        Sessions.remove(session._id);
    }); 
    // check for active games time defaults
    Games.find({
      endMessage: {$ne: ""}
    }).forEach(
      function (game) {
        var etime = now - game.ctime // elapsed time since last move
        if(game.wtime < etime) { // elapsed time is greater than time white has left
          gameEnd(game, "0-1", "Black wins due to white time default.");
        }
        if(game.btime < etime) { // ditto for black
          gameEnd(game, "1-0", "White wins due to black time default.");
        }
    }); 

  }, // end of setInterval function
  1000
);



