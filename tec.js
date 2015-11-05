var firebaseRoot = "https://cdlwebshops.firebaseio.com";

var publicChatRef   = new Firebase(firebaseRoot);
var firepadRef      = new Firebase(firebaseRoot + "/firepads");
var attendeesRef    = new Firebase(firebaseRoot + "/attendees");
var soloRef         = new Firebase(firebaseRoot + "/solos");
var partnershipsRef = new Firebase(firebaseRoot + "/partnerships");
var questionsRef    = new Firebase(firebaseRoot + "/questions");
var meetPartnerRef  = new Firebase(firebaseRoot + "/meetYourPartner");
var exercisesRef    = new Firebase(firebaseRoot + "/exercises");
var enrolledRef     = new Firebase(firebaseRoot + "/enrolled");
var feedbackRef     = new Firebase(firebaseRoot + "/feedback");

var loggedInUserId;
var questionPad, responsePad;

const PUBLIC_CHAT_ROOM_ID = '-JjXjD6_LIzT4f5DS9jP';
var publicChat;

var firstName = null;
var studentNum = null;
var studentCampus = null;
var lastSoloPriority = 0;
var lastQuestionAnswered;

function init() {
  firstName = getParameterByName('firstName');
  studentNum = getParameterByName('studentNum');
  studentCampus = getParameterByName('studentCampus');

  $('.carousel').carousel({
    interval: 5000
  });

  if (firstName == null || studentNum == null || studentCampus == null) {
    initModal();
    return;
  }

  publicChat = new FirechatUI(publicChatRef, document.getElementById("public-firechat-wrapper"));
  publicChat.maxLengthMessage = 1024;

  publicChat.on('room-enter', function() {
    stylizeChatRooms();
  });

  logInToChat(publicChatRef, publicChat, PUBLIC_CHAT_ROOM_ID, true);

  // REGISTER DOM ELEMENTS
  questionField = $('#question-txt');
  questionList = $('#example-questions');

  // LISTEN FOR KEYPRESS EVENT
  questionField.keypress(function (e) {
     if (e.keyCode == 13) {
          pushData();
          return false;
      }
  });

  $("#btnSend").click(function () {
      pushData();
  });

  $("#newPartner").hide();
  $("#newPartner").click(function () {
      leavePartnership();
  });

  $('.meetYourPartnerMe').on("input", function() {
    updateMyInfo($(this));
  });

  initEnrollForm();
  keepTabsOnTabs();
  setupInterviewScriptGenerator();
  setupFeedbackForm();
  setupQuizzes();

  setupiFrames();

  if (isSimpleMode()) {
    setupSimpleTabButtons();
  }
}

function setupiFrames() {
  $("iframe[data-src*='.']").each(function () {
    $(this).attr('src', $(this).attr('data-src'));
  });
}

function setupQuizzes() {
  // personalize each of the google form quizzes to include the student's number
  $("iframe[data-src*='[studentNum]']").each(function () {
    $(this).attr('data-src', $(this).attr('data-src').replace('[studentNum]', studentNum).replace('[studentCampus]', studentCampus));
  });
}

function setupFeedbackForm() {
  $('#feedbackTabContent .npsButtons button').click(function (e) {
    $(this).addClass('active');
    $(this).siblings().removeClass('active');

    feedbackRef.child(loggedInUserId).update({ nps: Number($(this).text()) });
  });

  $('#submitFeedbackButton').click(function (e) {
    feedbackRef.child(loggedInUserId).update({
      improve: $('#toImprove').val(),
      favorite: $('#favoritePart').val(),
    });

    $('#feedbackSuccessAlert').show();
  });
}

function setupInterviewScriptGenerator() {
  $("#customerRole").on("input", function() {
    $(".insertCustomerRole").text($(this).val());
  });

  $("#problemContext").on("input", function() {
    $(".insertProblemContext").text($(this).val());
  });
}

function updateMyInfo(elem) {
  updateMeetYourPartner(elem.attr('id'), elem.val());
}

function stylizeChatRooms() {
  // There's no class that represents this, so each time we create/join a room
  // we need to fix these elements
  $("#firechat textarea").parent().css("position", "absolute");
  $("#firechat textarea").parent().css("bottom", "5px");
  $("#firechat textarea").parent().css("left", "11px");
  $("#firechat textarea").parent().css("right", "11px");
}

function initEnrollForm() {
  $('#enrollForm').bootstrapValidator({
      message: 'This value is not valid',
      fields: {
          enrollEmail: {
              message: "Hmm, something doesn't look right.",
              validators: {
                  emailAddress: {
                      message: 'The value is not a valid email address'
                  }
              }
          }
      }
  });

  $("#enrollForm").submit(function(event) {
    event.preventDefault();

    enrolledRef.child(loggedInUserId).set({email: $('#enrollEmail').val()});
    $('#enrollSuccessAlert').show();
  });
}

function isSimpleMode() {
  return document.URL.indexOf("simple.html") != -1;
}

function getExerciseName(obj) {
  return $(obj).parents(".tabContent").attr("id").replace('TabContent', '');
}

function setupSimpleTabButtons() {
  $(".tabButtonGroup").show();

  $(".activeTabButton").click(function(obj) {
    var exerciseName = getExerciseName(this);

    exercisesRef.child(exerciseName).update({show: true});
    exercisesRef.child("active").update({exercise: exerciseName});
  });

  $(".showTabButton").click(function(obj) {
    var exerciseName = getExerciseName(this);

    exercisesRef.child(exerciseName).update({show: true});
  });

  $(".hideTabButton").click(function(obj) {
    var exerciseName = getExerciseName(this);

    exercisesRef.child(exerciseName).update({show: false});
  });

  $(".soloTabButton").click(function(obj) {
    var exerciseName = getExerciseName(this);

    spotlightTab(exerciseName + "Tab");
  });
}

// Only used to initialize the exercises before a session. Not actively used during a session.
function setupExercisesBeforeSession() {
  const DEFAULT_ACTIVE_TAB = "meetYourPartnerTab";

  spotlightTab(DEFAULT_ACTIVE_TAB);
}

function spotlightTab(tabName) {
  var inactive = {
    show: false
  }

  var active = {
    show: true
  }

  // Set all tabs to inactive
  $('.exerciseTabs > li > a').each( function(index) {
    exercisesRef.child($(this).attr("id").replace("Tab", '')).set(inactive);
  });

  // Turn default tab on
  exercisesRef.child(tabName.replace("Tab", '')).set(active);
  exercisesRef.child("active").set({exercise: tabName.replace("Tab", '')});
}

function keepTabsOnTabs() {
  exercisesRef.on('value', function(exercisesSnap) {
    var atLeastOneTabShown = false;
    var exercises = exercisesSnap.val();

    for (property in exercises) {
      var exercise = $('#' + property + "Tab");

      $('#' + property + "TabContent").find("button").removeClass('active');

      if (exercise.length > 0) {
        if (exercises[property] && exercises[property].show) {
          atLeastOneTabShown = true;

          if (isSimpleMode()) {
            $('#' + property + "TabContent").find(".showTabButton").addClass("active");
          }
          else {
            exercise.show();
          }
        }
        else {
          if (isSimpleMode()) {
            $('#' + property + "TabContent").find(".hideTabButton").addClass("active");
          }
          else {
            exercise.hide();
          }
        }
      }
    }

    if (exercises && exercises.active) {
      setActiveExercise(exercises.active.exercise);
    }

    if (!isSimpleMode()) {
      atLeastOneTabShown ? $('.exercisesPanel').show() : $('.exercisesPanel').hide();
    }
  });

  // If we don't do this, the firepads show up blank, until they are clicked w/n
  $('#liveInterviewTab').on('shown.bs.tab', function (e) {
    questionPad.codeMirror_.refresh();
    responsePad.codeMirror_.refresh();
  });
}

function setActiveExercise(exercise) {
  $('.exerciseTabs > li > a').each( function(index) {
    $(this).removeClass('currentExercise');
  });

  var toBeActive = $("#" + exercise + "Tab");

  if (toBeActive.length > 0) {
    toBeActive.addClass('currentExercise');

    if (!isSimpleMode()) {
      toBeActive.tab('show');
    }
  }

  if (isSimpleMode()) {
    $('#' + exercise + "TabContent").find(".activeTabButton").addClass("active");
  }
}

function updateMeetYourPartner(field, value) {
  var update = {};
  update[field] = value;

  meetPartnerRef.child(loggedInUserId).update(update);
}

function getMeetYourPartnerUpdates(user) {
  meetPartnerRef.child(user.id).once('value', function(snap) {
    console.log('updating my own partner details');

    if (snap == null) {
      console.log("I don't have any details yet.");
      return;
    }

    setPartnerDetails(snap.val(), true);
  });

  meetPartnerRef.child(user.lastPartner).on('value', function(snap) {
    console.log('partner updated their details');

    setPartnerDetails(snap.val(), false);
  });
}

function setPartnerDetails(details, isMyDetails) {
  var idQualifier = isMyDetails ? "" : "Partner";

  for (property in details) {
    var elem = $('#' + property + idQualifier);

    if (elem.is('a')) {
      elem.attr("href", "http://" + details[property].replace("http://", '').replace("https://", ''));
      elem.text(details[property]);
    }
    else if (elem.is('input')) {
      elem.val(details[property]);
    }
    else {
      elem.text(details[property]);
    }
  }
}

function initModal() {
  $('#welcomeForm').bootstrapValidator({
      message: 'This value is not valid',
      feedbackIcons: {
          valid: 'glyphicon glyphicon-ok',
          invalid: 'glyphicon glyphicon-remove',
          validating: 'glyphicon glyphicon-refresh'
      },
      fields: {
          firstName: {
              message: "That's not your name",
              validators: {
                  notEmpty: {
                      message: 'We need your name'
                  },
                  stringLength: {
                      min: 2,
                      max: 20,
                      message: 'We can do names between 2 and 20 characters'
                  }
              }
          },
          studentNum: {
              message: "That's not your student number",
              validators: {
                  notEmpty: {
                      message: 'We need your student number'
                  },
                  stringLength: {
                      min: 6,
                      max: 12,
                      message: 'We need a number between 6 and 12 digits'
                  }
              }
          },
          studentCampus: {
            validators: {
                notEmpty: {
                    message: 'Please select your campus.'
                }
            }
          }
      }
  });

  $( "#welcomeForm" ).submit(function(event) {
    firstName = $("#attendeeName").val();
    studentNum = $("#studentNum").val();
    studentCampus = $("#studentCampus").val();
  });

  $('#welcomeModal').modal({
    keyboard: false,
    backdrop: 'static'
  });
}

function initPad(url, div, msg) {
  // Create CodeMirror (with lineWrapping on).
  var codeMirror = CodeMirror(document.getElementById(div), { lineWrapping: true });

  var firepad = Firepad.fromCodeMirror(firepadRef.child(url), codeMirror,
      { richTextToolbar: false, richTextShortcuts: true });

  firepad.on('ready', function() {
    if (firepad.isHistoryEmpty()) {
      firepad.setHtml(msg);
    }
  });

  return firepad;
}

function logInToChat(chatRef, chatUI, roomId, getPartner) {
  var simpleLogin = new FirebaseSimpleLogin(chatRef, function(err, user) {
    if (user) {
      loggedInUserId = user.id;

      user.firstName = firstName;
      chatUI.setUser(user.id, firstName);

      if (roomId != null) {
        setTimeout(function() {
          chatUI._chat.enterRoom(roomId);
        }, 500);
      }

      if (getPartner) {
        searchForPartner(user);
      }

      authUserName = firstName;
      fbid = user.id;

      // simple should see all of the questions, everyone else should only see the unhidden ones
      var startAtNum = isSimpleMode() ? -1000000 : 1;

      // Add a callback that is triggered for each chat question.
      questionsRef.orderByChild('votes').startAt(startAtNum).on('value', function (allQuestionsSnapshot) {
          questionList.empty();

          var activeQuestion;

          allQuestionsSnapshot.forEach(function(snapshot) {

            //GET DATA
            var questionId = snapshot.key();
            var data = snapshot.val();
            var fbid_d = data.fbid;
            var username_d = data.name;
            var question_d = data.text;
            var date_d = data.currentdate;
            var votes_d = data.votes;

            divdir = "";

            //CREATE ELEMENTS question & SANITIZE TEXT
            var questionElement = $("<li class='media' f='" + fbid_d + "'>");
            var divmediabody = $("<div class='media-body'>");
            var divmedia = $("<div class='media'>");

            var voteLink;
            var userAskedQuestion = fbid_d == fbid;

            if (isSimpleMode()) {
              var answerText = data.isActive ? "Unanswer" : "Answer";
              var hideText = data.votes <= 0 ? "Show" : "Hide";

              voteLink = "<a id='q-" + questionId + "' class='answerQuestionButton' onClick='answerQuestion(&quot;" + questionId + "&quot;);'>" + answerText + "</a> <a id='q-" + questionId + "-hide' class='hideQuestionButton' onClick='hideQuestion(&quot;" + questionId + "&quot;);'>" + hideText + "</a>";
            }
            else if (userAskedQuestion) {
              // This user submitted the question
              voteLink = "<a id='q-" + questionId + "' class='deleteButton' onClick='deleteQuestion(&quot;" + questionId + "&quot;);'>Delete</a>";
            }
            else {
              var voteText = data.voters && data.voters.hasOwnProperty(fbid) ? "Down Vote" : "Up Vote";
              voteLink = "<a id='q-" + questionId + "' onClick='toggleVote(&quot;" + questionId + "&quot;);'>" + voteText + "</a>";
            }

            var voteCount = data.votes ? data.votes : 1;
            var votesElement = "<span style='float:right; font-weight:bold'>" + voteLink + ": "+ voteCount + "</span>";
            var userNameElement = " <span>" + (userAskedQuestion ? "You" : username_d) + "</span>";
            var dateElement = " <span style='float:right'>" + date_d + "</span>";

            var divmediabody2 = $("<div class='media-body divTxtL alert' style='padding:5px'>");
            questionElement.append(divmediabody);
            divmediabody.append(divmedia);
            //divmedia.append(a);
            //divmedia.append(votesElement);
            divmedia.append(divmediabody2);

            var usernamediv = $("<small class='text-muted'>");
            divmediabody2.html(question_d);

            divmediabody2.append(usernamediv);
            usernamediv.html("<br />" + userNameElement + "</small>" + votesElement);

            //ADD question
            if (data.isActive) {
              activeQuestion = questionElement;
              divmediabody2.addClass('bg-danger');
            }
            else {
              if (userAskedQuestion) {
                divmediabody2.addClass('bg-success');
                // divmediabody2.css('background', "#476982");
                // usernamediv.css('color', "#CCC")
              }
              else if (data.votes > 0) {
                // divmediabody2.css('background', "#73B3D7");
                divmediabody2.addClass('bg-info');
              }
              else {
                divmediabody2.addClass('bg-warning');
              }

              questionList.prepend(questionElement);
            }
          });

          questionList.prepend(activeQuestion);
      });

    } else {
      simpleLogin.login('anonymous', {
        rememberMe: true
      });
    }
  });
}

function loadFirepads(user, addDefaultText) {
  // questionPad = initPad(user.questionsPad, 'questionsPad', addDefaultText ? "Work with your partner to record the <b>questions</b> Justin asks during the customer interview here!<p/><br/><p/>You'll see what your partner types, as she/he does.<p/><br/><p/>Delete this intro once you and your partner have read it." : "");
  // responsePad = initPad(user.responsesPad, 'responsesPad', addDefaultText ? "Work with your partner to take <b>extensive notes</b> on the customer's resposes.<p/><br/><p/>(Delete this too :)"  : "");

  questionPad = initPad(user.questionsPad, 'questionsPad', addDefaultText ? "<b>1.</b> Decide which partner will be green, and which will be yellow.<br/>&nbsp;<br/><i>Note:</i> your partner will be able to see your text as you type it.<br/>&nbsp;<br/>Try editing this text!<br/>&nbsp;<br/>&nbsp;<br/><b>2.</b> Secretly pick a company below to pitch:<br/>&nbsp;<br/><ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li></ul>&nbsp;<br/><b>3.</b> Fill out the pitch template for the company you're pitching:<br/>&nbsp;<br/>- <i>Problem:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>- <i>Solution:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>- <i>Market:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/><b>4.</b> Summarize it into a single-sentence pitch:<br/>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>-------------------------------------------------------<br/>&nbsp;<br/><b>5.</b> Guess which company your partner is pitching:</br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/><b>6.</b> What's one thing he/she improve in their pitch?&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>" : "");
  responsePad = initPad(user.responsesPad, 'responsesPad', addDefaultText ? "<b>1.</b> Decide which partner will be green, and which will be yellow.<br/>&nbsp;<br/><i>Note:</i> your partner will be able to see your text as you type it.<br/>&nbsp;<br/>Try editing this text!<br/>&nbsp;<br/>&nbsp;<br/><b>2.</b> Secretly pick a company below to pitch:<br/>&nbsp;<br/><ul><li>1</li><li>2</li><li>3</li><li>4</li><li>5</li></ul>&nbsp;<br/><b>3.</b> Fill out the pitch template for the company you're pitching:<br/>&nbsp;<br/>- <i>Problem:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>- <i>Solution:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>- <i>Market:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/><b>4.</b> Summarize it into a single-sentence pitch:<br/>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>-------------------------------------------------------<br/>&nbsp;<br/><b>5.</b> Guess which company your partner is pitching:</br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/><b>6.</b> What's one thing he/she improve in their pitch?&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>"  : "");
}

function unloadFirepads() {
  console.log("unloading firepads");

  $('#responsesPad').hide().attr('id', 'oldResponsesPad').clone().show().attr('id', 'responsesPad').html('').appendTo("#responsesContainer");
  $('#questionsPad').hide().attr('id', 'oldQuestionsPad').clone().show().attr('id', 'questionsPad').html('').appendTo("#questionsContainer");

  try {
    questionPad.dispose();
  } catch (exc) {
    console.log("Error disposing question pad: " + exc.message);
  }

  try {
    responsePad.dispose();
  } catch (exc) {
    console.log("Error disposing response pad: " + exc.message);
  }

  $('#oldQuestionsPad').remove();
  $('#oldResponsesPad').remove();
}

function joinPartnership(user, partnership) {
  user.partnership = partnership;
  user.lastPartner = partnership.replace(user.id, "");

  attendeesRef.child(user.id).update(user);

  leavePrivateChatRooms();

  // join chat room
  partnershipsRef.child(partnership).on('value', function(partSnap) {
    var part = partSnap.val();

    if (part == null) {
      console.log("Partnership is null. Request to be terminated.");
      forgetPartnership(false);
      $("#partnerName").html("Your partner isn't available. Let's find another for you!");

      return;
    }
    else if (part.room != null) {
      console.log("Entering our partner chat room: " + part.room);
      publicChat._chat.enterRoom(part.room);

      user.partnerChatRoom = part.room;
      attendeesRef.child(user.id).update(user);
    }
  });

  soloRef.off('child_changed');

  // intro partners
  $("#partnerName").html("Say hi to your workshop partner, <span class='partnerName bold'></span>!");
  $('.partnerName').text(user.partnerName);
  $("#newPartner").show();

  getMeetYourPartnerUpdates(user);
}

function lookingForPartnerUI() {
  $("#partnerName").html("Looking for a partner for you...");
  $("#newPartner").hide();
}

function joinSoloList(user) {
  soloRef.child(user.id).setWithPriority(user, new Date().getTime());
  console.log("Added myself to the solo list.");

  lookingForPartnerUI();

  // since I'm the first to the meeting, use my id to key the firepads
  // my partner will hook into these pads
  user.questionsPad = "q-" + user.id;
  user.responsesPad = "r-" + user.id;

  // store my pad addresses
  attendeesRef.child(user.id).update(user);

  loadFirepads(user, true);

  soloRef.on('child_changed', function(soloSnap) {
    var solo = soloSnap.val();

    if (solo.id != user.id) {
      console.log("Someone else's solo changed");
      return;
    }

    console.log("Our solo changed...");

    if (solo.partnership == null) {
      console.log("but no one added a partnership. Not sure what's up.");
    }
    else {
      console.log("and we have a new partnership!");

      soloRef.child(user.id).remove(function(error) {
        if (error) {
          console.log("Error removing myself from the solo list", error);
        }
        else {
          console.log("Successfully removed myself from the solo list", error);
        }
      });

      user.partnerName = solo.partnerName;
      user.partnership = solo.partnership;

      publicChat._chat.createRoom("Private: " + user.firstName + " and " + user.partnerName, 'private', function(roomId) {
        console.log('Created our partnership chat room');
        partnershipsRef.child(solo.partnership).set({"room": roomId});

        user.partnerChatRoom = roomId;
        joinPartnership(user, solo.partnership);
      });
    }
  });
}

function searchForNextSolo(user, attemptNum) {
  // There were solos available, but we had a conflict trying to partner with one
  // Wait a bit and try again
  var MAX_ATTEMPTS_TO_SEARCH_FOR_ANOTHER_SOLO = 100;
  var attempt = attemptNum == null ? 0 : attemptNum;

  if (attempt >= MAX_ATTEMPTS_TO_SEARCH_FOR_ANOTHER_SOLO) {
    console.log("Exceeded max # of attempts to find a partner on the solo list. Skipping the solo search");

    joinSoloList(user);
  }
  else {
    setTimeout(partnerWithFirstSolo(user, ++attempt), 500);
    return;
  }
}

function partnerWithFirstSolo(user, attemptNum) {
  if (attemptNum != null) {
    console.log("This is attempt #" + (attemptNum + 1) + " to find a partner on the solo list.");
  }

  var firstSolo = soloRef.startAt(lastSoloPriority + 1).limit(1);

  firstSolo.once('value', function(solosSnap) {
    // Are there any solos?

    var solos = solosSnap.val();

    if (solos == null) {
      console.log('There are no available solos.');
      joinSoloList(user);
      return;
    }

    firstSolo.once('child_added', function(soloSnap) {
      // iterate the solos
      var solo = soloSnap.val();

      lastSoloPriority = soloSnap.getPriority();

      if (solo.id == user.lastPartner) {
        console.log("Found potential partner, but I just left a partnership with them. Skipping.");

        searchForNextSolo(user, attemptNum);
        return;
      }

      soloRef.child(solo.id).transaction(function(currentData) {
        if (currentData == null) {
          // This is just an inconsistent state. Keep going.
          return null;
        }

        if (currentData.partnership == null) {
          // let's make a baby!
          var partnership;

          if (user.id.localeCompare(solo.id) < 0) {
            partnership = user.id + solo.id;
          }
          else {
            partnership = solo.id + user.id;
          }

          user.partnership = partnership;
          user.partnerName = currentData.firstName;
          user.questionsPad = "q-" + solo.id;
          user.responsesPad = "r-" + solo.id;

          currentData.partnership = partnership;
          currentData.partnerName = user.firstName;

          return currentData;
        }

        // user already has a partnership, let's get out of here
        // not returning anything so we can retry on the solo list
      }, function(error, committed, snapshot) {
        if (error != null) {
          console.log('Transaction failed abnormally!', error);
        }
        else if (!committed) {
          console.log("This solo is no longer solo!");

          searchForNextSolo(user, attemptNum);
        }
        else {
          console.log('Successfully claimed this solo');

          // Wait for potential partner to confirm our hookup
          setTimeout(function(){confirmPartnershipAccepted(user)}, 3000);
        }
      }, true);
    });

  });
}

function confirmPartnershipAccepted(user) {
  partnershipsRef.child(user.partnership).once('value', function(partSnap) {
    var part = partSnap.val();

    if (part == null) {
      console.log("Potential parternship didn't consummate the partnership.");

      var flakySolo = user.partnership.replace(user.id, "");

      clearPartnerFromUser(user);

      console.log("Removing flaky partner from solo list: " + flakySolo);
      soloRef.child(flakySolo).remove(function(error) {
        if (error) {
          console.log('Error removing flaky solo: ' + error);
        } else {
          console.log('Flaky solo removed. Looking for another partner.');
          searchForSolos(user);
        }
      });

      return;
    }

    loadFirepads(user, false);
    joinPartnership(user, user.partnership);
  });
}

function searchForSolos(user) {
  // Make sure we're not on the solo list
  soloRef.child(user.id).transaction(function(currentData) {

    // Always return null because we want off this list
    return null;

  }, function(error, committed, snapshot) {
    if (error != null) {
      console.log('Transaction failed abnormally!', error);
      return;
    }
    else if (!committed) {
      console.log("I wasn't on the solo list. Proceed as planned.");
    }
    else {
      console.log('Successfully removed myself from the solo list');
    }

    lastSoloPriority = 0;
    partnerWithFirstSolo(user);
  }, true);
}

function checkAttendeeList(user) {
  attendeesRef.child(user.id).once('value', function(attendeeSnap) {
    var attendee = attendeeSnap.val();

    if (attendee == null) {
      console.log("I am not on the attendee list. Let's add me!");

      attendeesRef.child(user.id).set(user);
    }
    else if (attendee.partnership != null) {
      console.log("I already have a partnership: " + attendee.partnership);

      partnerFound = true;
      loadFirepads(attendee);
      joinPartnership(attendee, attendee.partnership);
      return;
    }
    else {
      console.log("I am an attendee without a partnership");
    }

    searchForSolos(user);
  });
}

function searchForPartner(user) {
  console.log("My user id is: " + user.id);

  checkAttendeeList(user);
}

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results == null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function leavePartnership() {
  console.log("Request to leave partnership.");

  if (loggedInUserId == null) {
    console.log("User isn't logged in.");
    return;
  }

  attendeesRef.child(loggedInUserId).once('value', function(attendeeSnap) {
    var user = attendeeSnap.val();

    if (user.partnership == null) {
      console.log("User doesn't have a partnership to leave. Partner already left.");
      searchForSolos(user);
    }
    else {
      console.log("This user is requesting to leave partnership.");
      lookingForPartnerUI();

      var partnership = user.partnership;

      partnershipsRef.child(user.partnership).off('value');

      partnershipsRef.child(partnership).remove(function(error) {
        if (error) {
          console.log('Error removing partnership: ' + error);
        } else {
          console.log('Partnership removed.');

          forgetPartnership(true);
        }
      });
    }
  });
}

function clearPartnerFromUser(user) {
  user.partnership = null;
  user.partnerName = null;
  user.questionsPad = null;
  user.responsesPad = null;
  user.partnerChatRoom = null;

  clearMeetYourPartner();
}

function clearMeetYourPartner() {
  $(".partnerData").text('');
}

function leavePrivateChatRooms() {
  // Leave all non-public chat rooms. Sometimes we weren't leaving chat rooms, some sort of race condition
  // having to do with getting new partners.
  var rooms = publicChat._chat._rooms;
  for (var key in rooms) {
    if (rooms.hasOwnProperty(key) && key != PUBLIC_CHAT_ROOM_ID) {
      publicChat._chat.leaveRoom(key);
    }
  }
  // if (user.partnerChatRoom) {
  //   publicChat._chat.leaveRoom(user.partnerChatRoom);
  // }
}

function forgetPartnership(searchForPartnerImmediately) {
  console.log("Forgetting my partnership.");

  attendeesRef.child(loggedInUserId).once('value', function(attendeeSnap) {
    var user = attendeeSnap.val();

    leavePrivateChatRooms();
    clearPartnerFromUser(user);
    unloadFirepads();

    attendeesRef.child(user.id).update(user);

    if (searchForPartnerImmediately) {
      // Need to search for new partner only after we clean up our partner data
      // because the partner data is how we determine if we should remove a solo from the solo list
      searchForSolos(user);
    }
  });
}

/* Questions */
var fbid = '';
var divdir = '';
var questionField;
var questionList;
var lastfid = '1';
var lastdir = 'L';
var newdir = 'L';
var authUserName = '';

$(document).ready( function() {
  init();
});

function hideQuestion(questionId) {
  var elem = $("#q-" + questionId + "-hide");
  var amHiding = elem.text().toLowerCase() == "hide";

  questionsRef.child(questionId).transaction(function(question) {
    if (question == null) {
      // This is just an inconsistent state. Keep going.
      return null;
    }

    question.votes = question.votes * -1;
    question.isActive = 0;
    return question;
  });
}

function answerQuestion(questionId) {
  var elem = $("#q-" + questionId);
  var amAnswering = elem.text().toLowerCase() == "answer";

  if (amAnswering) {
    if (lastQuestionAnswered) {
      questionsRef.child(lastQuestionAnswered).update({ isActive: false});
    }

    lastQuestionAnswered = questionId;
    questionsRef.child(questionId).update({ isActive: true });
  }
  else {
    questionsRef.child(questionId).update({ isActive: false});

    lastQuestionAnswered = null;
  }
}

function deleteQuestion(questionId) {
  bootbox.confirm("Are you sure?", function(confirmed) {
    if (confirmed) {
      questionsRef.child(questionId).remove();
    }
  });
}

function toggleVote(questionId) {
  questionsRef.child(questionId).transaction(function(currentData) {
    var question = $('#q-' + questionId);

    if (currentData.votes == null) {
      currentData.votes = 1;
    }

    if (currentData.voters && currentData.voters.hasOwnProperty(fbid)) {
      delete currentData.voters[fbid];

      currentData.votes--;
    }
    else if (currentData.voters == null){
      var newVoter = {};
      newVoter[fbid] = true;

      currentData.voters = newVoter;

      currentData.votes++;
    }
    else {
      currentData.voters[fbid] = true;
      currentData.votes++;
    }

    return currentData;

  }, function(error, committed, snapshot) {
    if (error != null) {
      console.log('Transaction failed abnormally!', error);
    }
    else if (!committed) {
      console.log("Transaction was aborted by us.");
    }
    else {
      console.log('Successfully voted');
    }
  }, true);
}

function pushData() {

    //FIELD VALUES
    var username = authUserName;
    var question = $("#question-txt").val();
    //Clientside Datetime
    var cdate = new Date();

    //***********************************************************
    //Set current text question direction to push it to firebase.
    //***********************************************************

    var newQ = questionsRef.push({ name: username, text: question, fbid: fbid, currentdate: cdate.toLocaleString(), votes: 1 });

    $("#question-txt").val('');

}
