// insert a document in the "sessions" collection for this session; remember id
var secretId = Random.id();
var sessionId = Sessions.insert({"lastSeen": (new Date()).getTime(), secretId: secretId});
//console.log("secretId " + secretId);
Meteor.subscribe("games", sessionId);
Meteor.subscribe("sessions");

// this is needed for the account create/sign in package
Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});

Template.main.helpers({

  "inGame": function() { // if game is returned, we are in a game
    return Sessions.findOne(sessionId).gameId != null;
  }
});

Template.getGameTemplate.helpers({
  "users": function() {
    return Sessions.find();
  }
});

Template.inGameTemplate.helpers({
  "games": function() {
    return Games.find(Sessions.findOne(sessionId).gameId);
   }
});

Template.gameTemplate.helpers({
  "nl2brnbsp": function(str) {
    return str.split(" ").join("&nbsp;").split("\n").join("<br />");
  },
   "ismyid": function(id) {
    return id == sessionId;
  }
});

Template.gameTemplate.events = {
  'keypress': function (evt, template) {
    if (evt.which === 13) {
      Meteor.call("move", sessionId, secretId, evt.target.value);
    }
  }
};

Template.userTemplate.events({
   click: function(event) {
     Meteor.call("offer", sessionId, secretId, this._id);
   }
});

// ping heartbeat every 3 seconds to ensure this session is still up
Meteor.setInterval(
  function () {
    Meteor.call('heartbeat', sessionId, secretId);
  }, 
  3000
);

