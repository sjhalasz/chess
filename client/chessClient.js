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
  gameId: null,
  offerTo: null,
  offerFrom: null
});
// console.log("secretId " + secretId);
Meteor.subscribe("games", sessionId);
Meteor.subscribe("sessions");

// this is needed for the account create/sign in package
Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});

Template.main.helpers({
  "alert": function() {
    return Session.get("alert");
  },
  "inGame": function() { // if game is returned, we are in a game
    return Games.findOne() != null;
  }
});

Template.getGameTemplate.helpers({
  "users": function() {
    return Sessions.find();
  }
});

Template.inGameTemplate.helpers({
  "games": function() {
    return Games.find();
   }
});

Template.gameTemplate.helpers({
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
  "myid": function() {return sessionId;},
  "equals": function(a, b) {return a == b;},
  "roundSeconds" : function(mseconds) {return roundSeconds(mseconds);},
  "countdown": function(time, ctime) {
    Session.set("countdownStart", ctime);
    Session.set("countdownMseconds", time);
    var newMseconds = Session.get("countdownNewMseconds");
    if(!newMseconds) newMseconds = time;
    return roundSeconds(newMseconds);
  },
});
var roundSeconds = function(mseconds) {return Math.floor(0.001 * (500 + mseconds));};
Session.set("countdownStart", 0);
Meteor.setInterval(
  function() {
    Meteor.call('heartbeat', sessionId, secretId);
    if(Session.get("alert")) { // currently processing an alert
      var alertTime = Session.get("alertTime");
      alertTime = alertTime - 1;
      if(alertTime == 0) {
        Session.set("alert", "");
      }
      Session.set("alertTime", alertTime);
    } else { // not currently processing an alert; look for one incoming
      var session = Sessions.findOne(sessionId);
      if(session.alert) {
        Session.set("alert", session.alert);
        Session.set("alertTime", 10);
        Meteor.call("cancelAlert", sessionId);
      }
    }
    var start = Session.get("countdownStart");
    if(start) {
      var timePassed = (new Date()).getTime() - start;
      var newMseconds = Session.get("countdownMseconds") - timePassed;
      Session.set("countdownNewMseconds", newMseconds);
    }
  },
  1000
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
  "click button": function(evt, template) {
    Meteor.call("resign", sessionId, secretId);
  }
};

Template.userTemplate.events({
   click: function(event) {
     Meteor.call("offer", sessionId, secretId, this._id);
   }
});


