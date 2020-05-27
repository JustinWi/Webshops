//var app = angular.module('app', ['firebase']);
var firebaseRoot = "https://cdlwebshops.firebaseio.com/entedu";

var rootRef = new Firebase(firebaseRoot);
var publicChatRef = new Firebase(firebaseRoot);
var firepadRef = new Firebase(firebaseRoot + "/firepads");
var attendeesRef = new Firebase(firebaseRoot + "/attendees");
var soloRef = new Firebase(firebaseRoot + "/solos");
var partnershipsRef = new Firebase(firebaseRoot + "/partnerships");
var questionsRef = new Firebase(firebaseRoot + "/questions");
var meetPartnerRef = new Firebase(firebaseRoot + "/meetYourPartner");
var exercisesRef = new Firebase(firebaseRoot + "/exercises");
var enrolledRef = new Firebase(firebaseRoot + "/enrolled");
var emailsRef = new Firebase(firebaseRoot + "/emails");
var feedbackRef = new Firebase(firebaseRoot + "/feedback");
var notesRef = new Firebase(firebaseRoot + "/notes");
var exerciseValuesRef = new Firebase(firebaseRoot + "/exerciseValues");

var declaringVictoryRef = exerciseValuesRef.child("declaringVictory");
var pmfAssessmentRef = exerciseValuesRef.child("pmfAssessment");

var loggedInUserId;
var questionPad, responsePad;
var myPMFAssessmentRef;

const PUBLIC_CHAT_ROOM_ID = '-JjXjD6_LIzT4f5DS9jP';
const GET_PARTNER = false;

var publicChat;

var firstName = null;
var emailAddress = null;

var lastSoloPriority = 0;
var lastQuestionAnswered;

var app = angular.module('app', [
  'ui.grid',
  'ui.grid.resizeColumns',
  'ui.grid.autoResize',
  'ui.grid.moveColumns',
  'ui.grid.saveState',
  'ngSanitize',
  'ui.bootstrap',
  'firebase']).
  directive('contenteditable', ['$sce', function ($sce) {
    return {
      restrict: 'A', // only activate on element attribute
      require: '?ngModel', // get a hold of NgModelController
      link: function (scope, element, attrs, ngModel) {
        if (!ngModel) return; // do nothing if no ng-model

        // Specify how UI should be updated
        ngModel.$render = function () {
          element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
        };

        // Listen for change events to enable binding
        element.on('blur keyup change', function () {
          scope.$evalAsync(read);
        });
        read(); // initialize

        // Write data to the model
        function read() {
          var html = element.html();
          // When we clear the content editable the browser leaves a <br> behind
          // If strip-br attribute is provided then we strip this out
          if (attrs.stripBr && html == '<br>') {
            html = '';
          }
          ngModel.$setViewValue(html);
        }
      }
    };
  }]);

app.controller('MainCtrl', ['$scope', '$firebaseArray', '$firebaseAuth', '$firebaseObject', 'uiGridConstants', function ($scope, $firebaseArray, $firebaseAuth, $firebaseObject, uiGridConstants) {
  var vm = this;

  var VictoryDeclarationFactory = $firebaseObject.$extend({
    // each time an update arrives from the server, apply the change locally
    $$defaults: {
      date: 'Write here',
      step1: 'Write here',
      step2: 'Write here',
      number: '&num;',
      things: 'things here',
      emotion: 'Write here',
      signature: 'Sign here',
      optIn: 'Want Feedback?'
    }
  });

  vm.gridOptions = {
    columnDefs: [
      {
        displayName: 'Help?',
        field: 'optIn',
      },
      {
        displayName: 'Number',
        field: 'number'
      },
      {
        displayName: 'Things',
        field: 'things'
      },
      {
        displayName: 'Emotion',
        field: 'emotion',
      },
      {
        displayName: 'Product',
        field: 'step1',
      },
      {
        displayName: 'Customer',
        field: 'step2',
      },
      {
        name: 'select',
        displayName: 'Select',
        cellTemplate: '<button id="selectBtn" type="button" class="btn-small" ng-click="grid.appScope.vm.giveFeedback(row.entity)" >Select</button> ',
        width: 60,
        enableSorting: false
      }
    ],
    // enableHorizontalScrollbar: uiGridConstants.scrollbars.NEVER,
    flatEntityAccess: true,
    enableGridMenu: true,
    enableFiltering: true,
    onRegisterApi: function (gridApi) {
      vm.gridApi = gridApi;
    }
  };

  if (isSimpleMode()) {
    vm.properties = $firebaseArray(declaringVictoryRef);
    vm.properties.$loaded().then(function () {
      vm.gridOptions.data = vm.properties;
    });

    vm.giveFeedback = function (exercise) {
      var victoryRef = declaringVictoryRef.child(exercise.$id);

      if (vm.feedbackObj) {
        vm.feedbackObj.$destroy();
      }

      vm.feedbackObj = VictoryDeclarationFactory(victoryRef);
      vm.feedbackObj.$bindTo($scope, "declaringVictoryFeedback");
    };
  }

  // $scope.giveFeedback = function(exercise) {
  //   console.log(exercise);
  //   // $state.transitionTo('club', { clubId: club.id });
  // };

  // vm.getTableHeight = function () {
  //     var rowHeight = 33;
  //     var headerHeight = 33;
  //     var height = vm.gridOptions.data.length * rowHeight + headerHeight;
  //     if (height > window.innerHeight) {
  //         height = window.innerHeight - 250;
  //     }
  //     return {
  //         height: height + "px"
  //     };
  // };


  if (!initParameters()) {
    initModal();
    return;
  }

  var auth = $firebaseAuth(rootRef);
  var dataFromAuth = auth.$getAuth();

  if (!dataFromAuth) {
    auth.$authAnonymously();
  }

  auth.$onAuth(function (authData) {
    postAuthConfig(authData, publicChat, PUBLIC_CHAT_ROOM_ID, GET_PARTNER);

    // var VictoryDeclarationGridFactory = $firebaseArray.$extend({
    //   // each time an update arrives from the server, apply the change locally
    //   columnDefs: [
    //     { field: 'date', displayName: 'Id' },
    //     { field: 'step1', displayName: 'Club Id', visible: false },
    //     { field: 'step2', displayName: 'Club Name' },
    //     { name: 'select', displayName: 'Select', cellTemplate: '<button id="selectBtn" type="button" class="btn-small" ng-click="getExternalScopes().giveFeedback(row.entity)" >Select</button> ' }
    //   ]
    // });

    var victoryRef = declaringVictoryRef.child(authData.uid);
    var victorySyncObj = VictoryDeclarationFactory(victoryRef);

    victorySyncObj.$bindTo($scope, "declaringVictory");

    // $scope.victoryDeclarations = {
    //   data: '$firebaseArray(declaringVictoryRef)',
    //   columnDefs: [
    //     {field: 'date', displayName: 'Id'},
    //     {field: 'step1', displayName: 'Club Id', visible: false},
    //     {field: 'step2', displayName: 'Club Name'},
    //     {name: 'select', displayName: 'Select', cellTemplate: '<button id="selectBtn" type="button" class="btn-small" ng-click="getExternalScopes().giveFeedback(row.entity)" >Select</button> '}
    //   ]
    // };

    // $scope.victoryDeclarations = {
    //   columnDefs: [
    //     {field: 'date', displayName: 'Id'},
    //     {field: 'step1', displayName: 'Club Id', visible: false},
    //     {field: 'step2', displayName: 'Club Name'},
    //     {name: 'select', displayName: 'Select', cellTemplate: '<button id="selectBtn" type="button" class="btn-small" ng-click="getExternalScopes().giveFeedback(row.entity)" >Select</button> '}
    //   ]
    // };

    // var vm = this;


    // vm.gridOptions = {
    //   columnDefs: [
    //     {
    //       displayName: 'PROS Number',
    //       field: 'date'
    //     },
    //     {
    //       displayName: 'MLS Status',
    //       field: 'step1'
    //     },
    //     {
    //       displayName: 'Deal Status',
    //       field: 'step2',
    //       enableColumnMenu: false,
    //       enableSorting: false
    //     }
    //   ],
    //   //enableHorizontalScrollbar: uiGridConstants.scrollbars.NEVER,
    //   flatEntityAccess: true,
    //   //rowHeight: '33',
    //   enableGridMenu: true,
    //   enableFiltering: true,
    //   onRegisterApi: function (gridApi) {
    //     vm.gridApi = gridApi;
    //   }
    // };  


    // //var dataRef = new Firebase('https://itjustwerks.firebaseio.com/data/properties'); // jshint ignore:line
    // vm.properties = $firebaseArray(declaringVictoryRef);
    // vm.properties.$loaded().then(function() {
    //   vm.gridOptions.data = vm.properties;
    // });



    // $scope.victoryDeclarations = {
    //   columnDefs: [
    //     { field: 'date', displayName: 'Id' },
    //     { field: 'step1', displayName: 'Club Id', visible: false },
    //     { field: 'step2', displayName: 'Club Name' },
    //     { name: 'select', displayName: 'Select', cellTemplate: '<button id="selectBtn" type="button" class="btn-small" ng-click="getExternalScopes().giveFeedback(row.entity)" >Select</button> ' }
    //   ]
    // };

    // var hope = $firebaseArray(declaringVictoryRef);

    // hope.$loaded().then(function () {
    //   $scope.victoryDeclarations.data = hope;
    // });

    // hope.columnDefs = [
    //     {field: 'date', displayName: 'Id'},
    //     {field: 'step1', displayName: 'Club Id', visible: false},
    //     {field: 'step2', displayName: 'Club Name'},
    //     {name: 'select', displayName: 'Select', cellTemplate: '<button id="selectBtn" type="button" class="btn-small" ng-click="getExternalScopes().giveFeedback(row.entity)" >Select</button> '}
    //   ]; 

    //$scope.victoryDeclarations = hope;
  });
}]);

function connectExercisesToFirebase(userId) {
  myPMFAssessmentRef = pmfAssessmentRef.child(userId);

  if (isSimpleMode()) {
    $('#refreshPMFChartsButton').show();

    refreshPMFCharts();
  }
}

function refreshPMFCharts() {
  pmfAssessmentRef.once("value", function (data) {
    populateChart(data.val());
  });
}

function populateChart(model, chartContainer, title) {
  var countMap = {};
  var pathMap = {}

  for (value in model) {
    var node = model[value];

    if (countMap[node.currentPhase]) {
      countMap[node.currentPhase].data += 1;
    }
    else {
      countMap[node.currentPhase] = {
        name: node.currentPhase,
        data: 1
      };
    }

    if (pathMap[node.assessmentPath]) {
      pathMap[node.assessmentPath].data += 1;
    }
    else {
      pathMap[node.assessmentPath] = {
        name: node.assessmentPath,
        data: 1
      };
    }
  }

  var phases = [];
  var phaseCounts = [];

  for (key in Object.keys(countMap)) {
    phases.push(countMap[Object.keys(countMap)[key]].name);
    phaseCounts.push(countMap[Object.keys(countMap)[key]].data);
  }

  var paths = [];
  var pathCounts = [];

  for (key in Object.keys(pathMap)) {
    paths.push(pathMap[Object.keys(pathMap)[key]].name);
    pathCounts.push(pathMap[Object.keys(pathMap)[key]].data);
  }

  $('#pmfPhaseChart').highcharts({
    chart: { type: 'column' },
    title: { text: 'Current Phase' },
    xAxis: {
      categories: phases
    },
    series: [{
      data: phaseCounts
    }]
  });

  $('#pmfPathChart').highcharts({
    chart: { type: 'column' },
    title: { text: 'Popular Paths' },
    xAxis: {
      categories: paths
    },
    series: [{
      data: pathCounts
    }]
  });
}

function initParameters() {
  firstName = getParameterByName('firstName');

  return firstName != null;
}

function getAttendees() {
  emailsRef.once('value', function (emailsSnap) {
    console.log(emailsSnap.numChildren());
  });
}

function getEnrollees() {
  enrolledRef.once('value', function (enrolledSnap) {
    enrolledSnap.forEach(function (snapshot) {
      console.log(snapshot.val().email);
    });
  });
}

function escapeRegExp(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
  if (str && find && replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
  }
}

function getFeedback() {
  feedbackRef.once('value', function (feedbackSnap) {
    feedbackSnap.forEach(function (snapshot) {
      var feedback = snapshot.val();
      console.log(feedback.nps + ",'" + replaceAll(feedback.favorite, "\r\n", "   ") + "','" + replaceAll(feedback.improve, "\r\n", "   ") + "'");
    });
  });
}

function initUI() {
  $('.carousel').carousel({
    interval: 5000
  });

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

  $('.meetYourPartnerMe').on("input", function () {
    updateMyInfo($(this));
  });

  keepTabsOnTabs();
  initEnrollForm();
  setupFeedbackForm();
  //setupInterviewScriptGenerator();
  //setupQuizzes();

  setupiFrames();

  if (isWebViewerMode()) {
    // load video stream
    var youTubeIFrame = $('.youtube-iframe');
    youTubeIFrame.attr("src", youTubeIFrame.attr("data-youtube-src"));
  }
  else {
    // get ride of video holder
    $('.left-column .top-row').hide();
    $('.left-column .bottom-row').addClass("full-height").removeClass("bottom-row");
  }

  if (isSimpleMode()) {
    setupSimpleTabButtons();
  }
}

function setupTextEditors() {

  tinymce.init({
    selector: '.text-editor',
    menubar: false,
    plugins: 'autoresize autosave',
    autosave_interval: "2s",
    setup: function (ed) {
      ed.on('init', function () {
        this.getDoc().body.style.fontSize = '16px';
        this.getDoc().body.style.fontName = 'Lato';
        // ed.target.editorCommands.execCommand("fontSize", false, "2");
        // ed.target.editorCommands.execCommand("fontName", false, "Lato");
      });
    }
  });
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
  $("#customerRole").on("input", function () {
    $(".insertCustomerRole").text($(this).val());
  });

  $("#problemContext").on("input", function () {
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

  $('#enrollForm').ajaxChimp({
    url: 'http://CustomerDevLabs.us6.list-manage.com/subscribe/post?u=7de22f15c9e97df7b49df664f&id=583a7a794d',
    callback: function (resp) {
      $('#enrollSuccessAlert').show();
      enrolledRef.child(loggedInUserId).set({ email: $('#enrollEmail').val() });
    }
  });

  // $("#enrollForm").submit(function (event) {
  //   event.preventDefault();
  //   enrolledRef.child(loggedInUserId).set({ email: $('#enrollEmail').val() });
  //   $('#enrollSuccessAlert').show();
  // });
}

function isSimpleMode() {
  return document.URL.indexOf("simple.html") != -1;
}

function isWebViewerMode() {
  return !isSimpleMode() && document.URL.indexOf("vip.html") == -1;
}

function getExerciseName(obj) {
  return $(obj).parents(".tabContent").attr("id").replace('TabContent', '');
}

function setupSimpleTabButtons() {
  $(".tabButtonGroup").show();

  $(".activeTabButton").click(function (obj) {
    var exerciseName = getExerciseName(this);

    exercisesRef.child(exerciseName).update({ show: true });
    exercisesRef.child("active").update({ exercise: exerciseName });
  });

  $(".showTabButton").click(function (obj) {
    var exerciseName = getExerciseName(this);

    exercisesRef.child(exerciseName).update({ show: true });
  });

  $(".hideTabButton").click(function (obj) {
    var exerciseName = getExerciseName(this);

    exercisesRef.child(exerciseName).update({ show: false });
  });

  $(".soloTabButton").click(function (obj) {
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
  $('.exerciseTabs > li > a').each(function (index) {
    exercisesRef.child($(this).attr("id").replace("Tab", '')).set(inactive);
  });

  // Turn default tab on
  exercisesRef.child(tabName.replace("Tab", '')).set(active);
  exercisesRef.child("active").set({ exercise: tabName.replace("Tab", '') });
}

function keepTabsOnTabs() {
  exercisesRef.on('value', function (exercisesSnap) {
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
  $('.exerciseTabs > li > a').each(function (index) {
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
  meetPartnerRef.child(user.uid).once('value', function (snap) {
    console.log('updating my own partner details');

    if (snap == null) {
      console.log("I don't have any details yet.");
      return;
    }

    setPartnerDetails(snap.val(), true);
  });

  meetPartnerRef.child(user.lastPartner).on('value', function (snap) {
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
      attendeeEmail: {
        message: "Hmm, something doesn't look right.",
        validators: {
          notEmpty: {
            message: 'Please enter your email address'
          },
          emailAddress: {
            message: 'The value is not a valid email address'
          }
        }
      }
    }
  });

  $("#welcomeForm").submit(function (event) {
    firstName = $("#attendeeName").val();
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

  firepad.on('ready', function () {
    if (firepad.isHistoryEmpty()) {
      firepad.setHtml(msg);
    }
  });

  return firepad;
}

function enterRoomAfterUserSessionCreated(chatUI, roomId) {
  const RETRY_IN = 500;

  if (chatUI._chat._sessionId == null) {
    setTimeout(enterRoomAfterUserSessionCreated, RETRY_IN, chatUI, roomId);
    return;
  }

  console.log("About to enter room. Room: " + roomId);
  chatUI._chat.enterRoom(roomId);
}

function postAuthConfig(authData, chatUI, roomId, getPartner) {
  console.log("Authenticated successfully with payload: ", authData);

  var user = authData;

  loggedInUserId = user.uid;
  user.firstName = firstName;
  //chatUI.setUser(user.uid, firstName);
  //enterRoomAfterUserSessionCreated(chatUI, roomId);

  connectExercisesToFirebase(loggedInUserId);

  emailsRef.child(loggedInUserId).set({ name: firstName });

  setupTextEditors();

  if (getPartner) {
    searchForPartner(user);
  }

  authUserName = firstName;
  fbid = user.uid;

  // simple should see all of the questions, everyone else should only see the unhidden ones
  var startAtNum = isSimpleMode() ? -1000000 : 1;

  // Add a callback that is triggered for each chat question.
  questionsRef.orderByChild('votes').startAt(startAtNum).on('value', function (allQuestionsSnapshot) {
    questionList.empty();

    var activeQuestion;

    allQuestionsSnapshot.forEach(function (snapshot) {

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

        voteLink =
          "<a id='q-" + questionId + "-top' class='topOfTheListQuestionButton' onClick='moveQuestionToTop(&quot;" + questionId + "&quot;);'>Top</a> | " +
          "<a id='q-" + questionId + "-middle' class='middleOfTheListQuestionButton' onClick='moveQuestionToMiddle(&quot;" + questionId + "&quot;);'>Middle</a> | " +
          "<a id='q-" + questionId + "' class='answerQuestionButton' onClick='answerQuestion(&quot;" + questionId + "&quot;);'>" + answerText + "</a> | " +
          "<a id='q-" + questionId + "-hide' class='toggleQuestionVisibilityButton' onClick='toggleQuestionVisibility(&quot;" + questionId + "&quot;);'>" + hideText + "</a>";
      }
      else if (userAskedQuestion) {
        // This user submitted the question
        voteLink = "<a id='q-" + questionId + "' class='deleteButton' onClick='deleteQuestion(&quot;" + questionId + "&quot;);'>Delete</a>";
      }
      else {
        var voteText = data.voters && data.voters.hasOwnProperty(fbid) ? "Down Vote" : "Up Vote";
        voteLink = "<a id='q-" + questionId + "' onClick='toggleVote(&quot;" + questionId + "&quot;);'>" + voteText + "</a>";
      }

      var voteCount = data.votes ? data.votes : 0;
      var votesElement = "<span style='float:right; font-weight:bold'>" + voteLink + ": " + voteCount + "</span>";
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
        divmediabody2.addClass('bg-warning');
      }
      else {
        if (userAskedQuestion) {
          divmediabody2.addClass('bg-info');
          // divmediabody2.css('background', "#476982");
          // usernamediv.css('color', "#CCC")
        }
        else if (data.votes > 0) {
          // divmediabody2.css('background', "#73B3D7");
          divmediabody2.addClass('bg-primary');
        }
        else {
          divmediabody2.addClass('this-class-does-not-exist');
        }

        questionList.prepend(questionElement);
      }
    });

    questionList.prepend(activeQuestion);
  });
}

function logInToChat(ref, chatUI, roomId, getPartner) {
  var dataFromAuth = ref.getAuth();

  if (dataFromAuth) {
    postAuthConfig(dataFromAuth, chatUI, roomId, getPartner);
    return;
  }

  ref.authAnonymously(function (error, authData) {
    if (error) {
      console.log("Login Failed!", error);
      return;
    }

    postAuthConfig(authData, chatUI, roomId, getPartner);

  });
}

//   var simpleLogin = new FirebaseSimpleLogin(chatRef, function(err, user) {
//     if (user) {
//       loggedInUserId = user.uid;
//
//       user.firstName = firstName;
//       chatUI.setUser(user.uid, firstName);
//
//       if (roomId != null) {
//         setTimeout(function() {
//           console.log("About to enter room. User: " + JSON.stringify(user) + ". Room: " + roomId);
//           chatUI._chat.enterRoom(roomId);
//         }, 500);
//       }
//
//       if (getPartner) {
//         searchForPartner(user);
//       }
//
//       authUserName = firstName;
//       fbid = user.uid;
//
//       // simple should see all of the questions, everyone else should only see the unhidden ones
//       var startAtNum = isSimpleMode() ? -1000000 : 1;
//
//       // Add a callback that is triggered for each chat question.
//       questionsRef.orderByChild('votes').startAt(startAtNum).on('value', function (allQuestionsSnapshot) {
//           questionList.empty();
//
//           var activeQuestion;
//
//           allQuestionsSnapshot.forEach(function(snapshot) {
//
//             //GET DATA
//             var questionId = snapshot.key();
//             var data = snapshot.val();
//             var fbid_d = data.fbid;
//             var username_d = data.name;
//             var question_d = data.text;
//             var date_d = data.currentdate;
//             var votes_d = data.votes;
//
//             divdir = "";
//
//             //CREATE ELEMENTS question & SANITIZE TEXT
//             var questionElement = $("<li class='media' f='" + fbid_d + "'>");
//             var divmediabody = $("<div class='media-body'>");
//             var divmedia = $("<div class='media'>");
//
//             var voteLink;
//             var userAskedQuestion = fbid_d == fbid;
//
//             if (isSimpleMode()) {
//               var answerText = data.isActive ? "Unanswer" : "Answer";
//               var hideText = data.votes <= 0 ? "Show" : "Hide";
//
//               voteLink = "<a id='q-" + questionId + "' class='answerQuestionButton' onClick='answerQuestion(&quot;" + questionId + "&quot;);'>" + answerText + "</a> <a id='q-" + questionId + "-hide' class='toggleQuestionVisibilityButton' onClick='toggleQuestionVisibility(&quot;" + questionId + "&quot;);'>" + hideText + "</a>";
//             }
//             else if (userAskedQuestion) {
//               // This user submitted the question
//               voteLink = "<a id='q-" + questionId + "' class='deleteButton' onClick='deleteQuestion(&quot;" + questionId + "&quot;);'>Delete</a>";
//             }
//             else {
//               var voteText = data.voters && data.voters.hasOwnProperty(fbid) ? "Down Vote" : "Up Vote";
//               voteLink = "<a id='q-" + questionId + "' onClick='toggleVote(&quot;" + questionId + "&quot;);'>" + voteText + "</a>";
//             }
//
//             var voteCount = data.votes ? data.votes : 1;
//             var votesElement = "<span style='float:right; font-weight:bold'>" + voteLink + ": "+ voteCount + "</span>";
//             var userNameElement = " <span>" + (userAskedQuestion ? "You" : username_d) + "</span>";
//             var dateElement = " <span style='float:right'>" + date_d + "</span>";
//
//             var divmediabody2 = $("<div class='media-body divTxtL alert' style='padding:5px'>");
//             questionElement.append(divmediabody);
//             divmediabody.append(divmedia);
//             //divmedia.append(a);
//             //divmedia.append(votesElement);
//             divmedia.append(divmediabody2);
//
//             var usernamediv = $("<small class='text-muted'>");
//             divmediabody2.html(question_d);
//
//             divmediabody2.append(usernamediv);
//             usernamediv.html("<br />" + userNameElement + "</small>" + votesElement);
//
//             //ADD question
//             if (data.isActive) {
//               activeQuestion = questionElement;
//               divmediabody2.addClass('bg-danger');
//             }
//             else {
//               if (userAskedQuestion) {
//                 divmediabody2.addClass('bg-success');
//                 // divmediabody2.css('background', "#476982");
//                 // usernamediv.css('color', "#CCC")
//               }
//               else if (data.votes > 0) {
//                 // divmediabody2.css('background', "#73B3D7");
//                 divmediabody2.addClass('bg-info');
//               }
//               else {
//                 divmediabody2.addClass('bg-warning');
//               }
//
//               questionList.prepend(questionElement);
//             }
//           });
//
//           questionList.prepend(activeQuestion);
//       });
//
//     } else {
//       simpleLogin.login('anonymous', {
//         rememberMe: true
//       });
//     }
//   });
// }

function loadFirepads(user, addDefaultText) {
  // questionPad = initPad(user.questionsPad, 'questionsPad', addDefaultText ? "Work with your partner to record the <b>questions</b> Justin asks during the customer interview here!<p/><br/><p/>You'll see what your partner types, as she/he does.<p/><br/><p/>Delete this intro once you and your partner have read it." : "");
  // responsePad = initPad(user.responsesPad, 'responsesPad', addDefaultText ? "Work with your partner to take <b>extensive notes</b> on the customer's resposes.<p/><br/><p/>(Delete this too :)"  : "");

  questionPad = initPad(user.questionsPad, 'questionsPad', addDefaultText ? "<b>1.</b> Decide which partner will be on the left, and which will be on the right.<br/>&nbsp;<br/><i>Note:</i> your partner will be able to see your text as you type it.<br/>&nbsp;<br/>Try editing this text!<br/>&nbsp;<br/>&nbsp;<br/><b>2.</b> Secretly pick a company below to pitch:<br/>&nbsp;<br/><ul><li>AirBnB</li><li>Pampers (diapers)</li><li>Twitter</li><li>Facebook</li><li>Subway (sandwiches)</li><li>Instagram</li><li>Disney</li><li>SnapChat</li><li>Angry Birds (Rovio)</li><li>RedBull</li></ul>&nbsp;<br/><b>3.</b> Fill out the pitch template for the company you're pitching:<br/>&nbsp;<br/>- <i>Problem:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>- <i>Solution:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>- <i>Market:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>- <i>Business Model:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>-------------------------------------------------------<br/>&nbsp;<br/><b>4.</b> Guess which company your partner is pitching:</br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/><b>5.</b> Which elements of your partner's pitch could be improved?&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>" : "");
  responsePad = initPad(user.responsesPad, 'responsesPad', addDefaultText ? "<b>1.</b> Decide which partner will be on the left, and which will be on the right.<br/>&nbsp;<br/><i>Note:</i> your partner will be able to see your text as you type it.<br/>&nbsp;<br/>Try editing this text!<br/>&nbsp;<br/>&nbsp;<br/><b>2.</b> Secretly pick a company below to pitch:<br/>&nbsp;<br/><ul><li>AirBnB</li><li>Pampers (diapers)</li><li>Twitter</li><li>Facebook</li><li>Subway (sandwiches)</li><li>Instagram</li><li>Disney</li><li>SnapChat</li><li>Angry Birds (Rovio)</li><li>RedBull</li></ul>&nbsp;<br/><b>3.</b> Fill out the pitch template for the company you're pitching:<br/>&nbsp;<br/>- <i>Problem:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>- <i>Solution:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>- <i>Market:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>- <i>Business Model:</i></br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>-------------------------------------------------------<br/>&nbsp;<br/><b>4.</b> Guess which company your partner is pitching:</br>&nbsp;<br/>&nbsp;<br/>&nbsp;<br/><b>5.</b> Which elements of your partner's pitch could be improved?&nbsp;<br/>&nbsp;<br/>&nbsp;<br/>" : "");
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
  user.lastPartner = partnership.replace(useruser.uid, "");

  attendeesRef.child(user.uid).update(user);

  leavePrivateChatRooms();

  // join chat room
  partnershipsRef.child(partnership).on('value', function (partSnap) {
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
      attendeesRef.child(user.uid).update(user);
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
  soloRef.child(user.uid).setWithPriority(user, new Date().getTime());
  console.log("Added myself to the solo list.");

  lookingForPartnerUI();

  // since I'm the first to the meeting, use my id to key the firepads
  // my partner will hook into these pads
  user.questionsPad = "q-" + user.uid;
  user.responsesPad = "r-" + user.uid;

  // store my pad addresses
  attendeesRef.child(user.uid).update(user);

  //loadFirepads(user, true);

  soloRef.on('child_changed', function (soloSnap) {
    var solo = soloSnap.val();

    if (solo.id != user.uid) {
      console.log("Someone else's solo changed");
      return;
    }

    console.log("Our solo changed...");

    if (solo.partnership == null) {
      console.log("but no one added a partnership. Not sure what's up.");
    }
    else {
      console.log("and we have a new partnership!");

      soloRef.child(user.uid).remove(function (error) {
        if (error) {
          console.log("Error removing myself from the solo list", error);
        }
        else {
          console.log("Successfully removed myself from the solo list", error);
        }
      });

      user.partnerName = solo.partnerName;
      user.partnership = solo.partnership;

      publicChat._chat.createRoom("Private: " + user.firstName + " and " + user.partnerName, 'private', function (roomId) {
        console.log('Created our partnership chat room');
        partnershipsRef.child(solo.partnership).set({ "room": roomId });

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

  firstSolo.once('value', function (solosSnap) {
    // Are there any solos?

    var solos = solosSnap.val();

    if (solos == null) {
      console.log('There are no available solos.');
      joinSoloList(user);
      return;
    }

    firstSolo.once('child_added', function (soloSnap) {
      // iterate the solos
      var solo = soloSnap.val();

      lastSoloPriority = soloSnap.getPriority();

      if (solo.id == user.lastPartner) {
        console.log("Found potential partner, but I just left a partnership with them. Skipping.");

        searchForNextSolo(user, attemptNum);
        return;
      }

      soloRef.child(solo.id).transaction(function (currentData) {
        if (currentData == null) {
          // This is just an inconsistent state. Keep going.
          return null;
        }

        if (currentData.partnership == null) {
          // let's make a baby!
          var partnership;

          if (user.uid.localeCompare(solo.id) < 0) {
            partnership = user.uid + solo.id;
          }
          else {
            partnership = solo.id + user.uid;
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
      }, function (error, committed, snapshot) {
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
          setTimeout(function () { confirmPartnershipAccepted(user) }, 3000);
        }
      }, true);
    });

  });
}

function confirmPartnershipAccepted(user) {
  partnershipsRef.child(user.partnership).once('value', function (partSnap) {
    var part = partSnap.val();

    if (part == null) {
      console.log("Potential parternship didn't consummate the partnership.");

      var flakySolo = user.partnership.replace(user.uid, "");

      clearPartnerFromUser(user);

      console.log("Removing flaky partner from solo list: " + flakySolo);
      soloRef.child(flakySolo).remove(function (error) {
        if (error) {
          console.log('Error removing flaky solo: ' + error);
        } else {
          console.log('Flaky solo removed. Looking for another partner.');
          searchForSolos(user);
        }
      });

      return;
    }

    //loadFirepads(user, false);
    joinPartnership(user, user.partnership);
  });
}

function searchForSolos(user) {
  // Make sure we're not on the solo list
  soloRef.child(user.uid).transaction(function (currentData) {

    // Always return null because we want off this list
    return null;

  }, function (error, committed, snapshot) {
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
  attendeesRef.child(user.uid).once('value', function (attendeeSnap) {
    var attendee = attendeeSnap.val();

    if (attendee == null) {
      console.log("I am not on the attendee list. Let's add me!");

      attendeesRef.child(user.uid).set(user);
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
  console.log("My user id is: " + user.uid);

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

  attendeesRef.child(loggedInUserId).once('value', function (attendeeSnap) {
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

      partnershipsRef.child(partnership).remove(function (error) {
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

  attendeesRef.child(loggedInUserId).once('value', function (attendeeSnap) {
    var user = attendeeSnap.val();

    leavePrivateChatRooms();
    clearPartnerFromUser(user);
    unloadFirepads();

    attendeesRef.child(user.uid).update(user);

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

const DEFAULT_QUESTION_VOTES = 0;
const MIDDLE_OF_LIST_VOTES = 50;
const TOP_OF_LIST_VOTES = 100;

$(document).ready(function () {
  initUI();
});

function toggleQuestionVisibility(questionId) {
  var elem = $("#q-" + questionId + "-hide");
  var amHiding = elem.text().toLowerCase() == "hide";

  questionsRef.child(questionId).transaction(function (question) {
    if (question == null) {
      // This is just an inconsistent state. Keep going.
      return null;
    }

    if (question.votes == 0) {
      question.votes = 1;
    }
    else {
      question.votes = question.votes * -1;
      question.isActive = 0;
    }

    return question;
  });
}

function moveQuestionToMiddle(questionId) {
  var elem = $("#q-" + questionId);

  questionsRef.child(questionId).update({ votes: MIDDLE_OF_LIST_VOTES });
}

function moveQuestionToTop(questionId) {
  var elem = $("#q-" + questionId);

  questionsRef.child(questionId).update({ votes: TOP_OF_LIST_VOTES });
}

function answerQuestion(questionId) {
  var elem = $("#q-" + questionId);
  var amAnswering = elem.text().toLowerCase() == "answer";

  if (amAnswering) {
    if (lastQuestionAnswered) {
      questionsRef.child(lastQuestionAnswered).update({ isActive: false });
    }

    lastQuestionAnswered = questionId;
    questionsRef.child(questionId).update({ isActive: true });
  }
  else {
    questionsRef.child(questionId).update({ isActive: false });

    lastQuestionAnswered = null;
  }
}

function deleteQuestion(questionId) {
  bootbox.confirm("Are you sure?", function (confirmed) {
    if (confirmed) {
      questionsRef.child(questionId).remove();
    }
  });
}

function toggleVote(questionId) {
  questionsRef.child(questionId).transaction(function (currentData) {
    var question = $('#q-' + questionId);

    if (currentData.votes == null) {
      currentData.votes = 1;
    }

    if (currentData.voters && currentData.voters.hasOwnProperty(fbid)) {
      delete currentData.voters[fbid];

      currentData.votes--;
    }
    else if (currentData.voters == null) {
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

  }, function (error, committed, snapshot) {
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

  var newQ = questionsRef.push({ name: username, text: question, fbid: fbid, currentdate: cdate.toLocaleString(), votes: DEFAULT_QUESTION_VOTES });

  $("#question-txt").val('');

}
