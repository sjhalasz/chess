// insert a document in the "sessions" collection for this session; remember id

var WK = "♔";
var WQ = "♕";
var WR = "♖";
var WB = "♗";
var WN = "♘";
var WP = "♙";
var BK = "♚";
var BQ = "♛";
var BR = "♜";
var BB = "♝";
var BN = "♞";
var BP = "♟";

var secretId = Random.id();
var sessionId = Sessions.insert({
  "lastSeen": (new Date()).getTime(), 
  secretId: secretId,
  offerTo: [],
  offerFrom: []
});
// console.log("secretId " + secretId);
Meteor.subscribe("games", sessionId);
Meteor.subscribe("sessions");

// this is needed for the account create/sign in package
Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});

Session.set("gameInProgress", false);
Session.set("endMessage", "");

Template.main.helpers({
  "inGame": function() { // if game is returned, we are in a game
    return Session.get("gameInProgress");
  }
});

Template.getGameTemplate.helpers({
  "users": function() {
    return Sessions.find({_id: {$ne: sessionId}});
  }
});

Template.inGameTemplate.helpers({
  "games": function() {
    return Games.find();
   }
});

Template.gameTemplate.helpers({
  "alert": function() {
    return Session.get("endMessage");
  },
  "notOver": function() {
    return Session.get("endMessage") == "";
  },
  "nl2brnbsp": function(str) {
    str = str.replace(/a  b/, "aaaa");
    str = str.replace(/K/g, WK);    
    str = str.replace(/Q/g, WQ);    
    str = str.replace(/B/g, WB);    
    str = str.replace(/N/g, WN);    
    str = str.replace(/R/g, WR);    
    str = str.replace(/P/g, WP);    
    str = str.replace(/k/g, BK);    
    str = str.replace(/q/g, BQ);    
    str = str.replace(/b/g, BB);    
    str = str.replace(/n/g, BN);    
    str = str.replace(/r/g, BR);    
    str = str.replace(/p/g, BP);    
    str = str.replace("aaaa", "a  b");
    str = str.replace(/ /g, "&nbsp;");
    str = str.replace(/\n/g, "<br />");
    return str;
  },
  "formatRound" : function(mseconds) {return timeFormat(roundSeconds(mseconds));},
  "countdown": function(time, ctime) {
    Session.set("countdownStart", ctime);
    Session.set("countdownMseconds", time);
    var newMseconds = Session.get("countdownNewMseconds");
    if(!newMseconds) newMseconds = time;
    return timeFormat(roundSeconds(newMseconds));
  },
});
var roundSeconds = function(mseconds) {return Math.floor(0.001 * (500 + mseconds));};
Session.set("countdownStart", 0);
Meteor.setInterval(
  function() {
    Meteor.call('heartbeat', sessionId, secretId);
    var game = Games.findOne();
    if(!Session.get("gameInProgress")) {
      if(game) {
        Session.set("gameInProgress", true);
      }
    } else { // game is in progress
      if(game.endMessage) Session.set("endMessage", game.endMessage);
    }
    var start = Session.get("countdownStart");
    if(start && !game.endMessage) {
      var timePassed = (new Date()).getTime() - start;
      var newMseconds = Session.get("countdownMseconds") - timePassed;
      Session.set("countdownNewMseconds", newMseconds);
    }
  },
  1000
);

Template.registerHelper(
  "myid", function() {return sessionId;}
);

Template.registerHelper(
  "equals", function(a, b) {return a == b;}
);

Template.registerHelper(
  "equals3", function(a, b, c) {return a == b && b == c;}
);

Template.registerHelper(
  "in", function(array, element) {return _.contains(array, element);}
);

Template.gameTemplate.events = {
  'keypress': function (evt, template) {
    if (evt.which === 13) {
      Meteor.call("move", sessionId, secretId, evt.target.value);
      Session.set("countdownStart", 0); // turn off timer
      Session.set("countdownMseconds", 0);
      Session.set("countdownNewMseconds", 0);
    }
  },
  "click .draw" : function(evt, template) {
    Meteor.call("offerDraw", sessionId, secretId);
  },
  "click .resign": function(evt, template) {
    Meteor.call("resign", sessionId, secretId);
  },
  "click .closeGame": function(evt, template) {
    Session.set("gameInProgress", false);
    Session.set("endMessage", "");
    Meteor.call("closeGame", sessionId, secretId);
  }
};

Template.userTemplate.events({
   click: function(event) {
     Meteor.call("offer", sessionId, secretId, this._id);
   }
});

var timeFormat = function(seconds) {
  var hrs = ~~(seconds / 3600);
  var mins = ~~((seconds % 3600) / 60);
  var secs = seconds % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  ret = "";
  if (hrs > 0)
    ret += hrs + ":" + (mins < 10 ? "0" : "");
  ret += mins + ":" + (secs < 10 ? "0" : "");
  ret += secs;
  return ret;
};

