var ROCKET_CHAT_SERVER = "https://webshop-rocket-chat.herokuapp.com";

var database = firebase.database();

function getParentParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(window.parent.parent.location.search);
  return results == null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

$(document).ready(function () {
  var rocketUser = getParentParameterByName("rocketUser");
  var rocketPass = getParentParameterByName("rocketPass");

  if (rocketPass && rocketUser) {
    attemptRocketChatLogin(
      {
        email: rocketUser, 
        password: rocketPass
      }, function (errorResult) {
      genericRocketChatLogin();
    });
  }
  else {
    genericRocketChatLogin();
  }
});

function genericRocketChatLogin() {
  var userId = localStorage.getItem("firebaseUserId");

  database.ref(workshopRoot + "/profiles").child(userId).on('value', function (snap) {
    var userData = snap.val();

    userData.uid = userId;

    var userCreds = generateUserCreds(userData);

    attemptRocketChatLogin(userCreds, function (errorResult) {
      createRocketChatUser(userData, userCreds);
    });
  });
}

function createRocketChatUser(userData, userCreds) {
  var rcAccountCreatorCreds = {
    "username": "account-creator-api",
    "password": "MZiFvWAf96876875u4"
  };

  $.ajax({
    url: ROCKET_CHAT_SERVER + "/api/v1/login",
    type: "POST",
    data: JSON.stringify(rcAccountCreatorCreds),
    contentType: "application/json",
    success: function (msg) {
      console.log("Account Creator Login Success.");

      var loginData = msg.data;
      var newUser = {
        "name": userData.name,
        "email": userCreds.username + "@example.com",
        "username": userCreds.username,
        "password": userCreds.password
      }

      $.ajax({
        url: ROCKET_CHAT_SERVER + "/api/v1/users.create",
        type: "POST",
        headers: {
          "X-Auth-Token": loginData.authToken,
          "X-User-Id": loginData.userId
        },
        data: JSON.stringify(newUser),
        contentType: "application/json",
        success: function (msg) {
          console.log("Creating User Success: " + JSON.stringify(msg));

          attemptRocketChatLogin(userCreds);
        }
      });
    }
  });
}

function attemptRocketChatLogin(userCreds, errorCallback) {
  console.log("Attempting RocketChat Login.")

  $.ajax({
    url: ROCKET_CHAT_SERVER + "/api/v1/login",
    type: "POST",
    data: JSON.stringify(userCreds),
    contentType: "application/json",
    success: function (result) {
      console.log("Successful user login: " + JSON.stringify(result));

      window.parent.postMessage({
        event: 'login-with-token',
        loginToken: result.data.authToken
      }, ROCKET_CHAT_SERVER);
    },
    error: function (result) {
      console.log("Error attempting RocketChat login: " + JSON.stringify(result));

      if (errorCallback) {
        errorCallback(result);
      }
    }
  });
}

function generateUserCreds(userData) {
  var LENGTH_OF_USERNAME_RAND = 5;

  // create usernames that consist of the pre-@ portion of the email address
  // plus some randomness from the userid
  // The goal is to make a username that is easy for someone to @mention in chat
  // but is still unique, w/o making users type in their own usernames
  var username = userData.email.substring(0, userData.email.indexOf("@")) + userData.uid.substring(0, LENGTH_OF_USERNAME_RAND);
  var password = userData.uid;

  return {
    username: username,
    password: password
  };
}

