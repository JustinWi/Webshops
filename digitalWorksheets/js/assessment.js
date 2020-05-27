$(document).ready(function () {

  $('#qTable a').each(function () {
    var link = $(this);

    if (link.attr("href").toLowerCase().indexOf("customerdevlabs.com/focus") >= 0) {
      link.attr("href", "https://www.thefocusframework.com/#toc");
      link.attr("target", "_blank");
    }
  });

  configDynamicQuestionSurvey("#qTable", "#treeTable", function () {
    setCurrentPhase($('#treeTable .phaseTitle:visible'));
    setAssessmentPath();
  });

  configDynamicQuestionSurvey("#pollQTable", "#pollTreeTable", function () {
    setPollAnswer();
    if (refreshPollCharts) {
      refreshPollCharts()
    }
  });

});

function setPollAnswer() {
  var path = "";
  var questions = {};

  if (!myPollRef) {
    return;
  }

  // get selected buttons
  $('#pollTreeTable .question .btn-primary').each(function (ndx) {
    if ($(this).text()) {
      var html = $(this).html();

      if (html.indexOf("<i>") != -1) {
        html = html.substring(0, html.indexOf("<i>"));
      }

      questions["Question_" + (ndx + 1)] = html;
    }
  });

  myPollRef.update(questions);
}

function configDynamicQuestionSurvey(questionTableSelector, treeTableSelector, onSelectionFunction) {
  $(questionTableSelector + ' li').on('click', function () {
    //style the selected answer
    $(this).removeClass('btn-default').addClass('btn-primary').siblings("li").removeClass('btn-primary').addClass('btn-default');
    //hide all rows after the currently displayed row and remove selectedAnswer style
    $(this).closest("tr").prevAll("tr").remove();

    //show the next row that matches the question id
    var italNum = $(this).find('i').text();
    var qNextSelector = ' tr:nth-child(' + italNum + ')';
    var nextQuestion = $(questionTableSelector + qNextSelector).clone(true).hide();

    $(treeTableSelector).prepend(nextQuestion);
    nextQuestion.fadeIn(800, onSelectionFunction);
  })

  // setup first question
  var firstQuestion = $(questionTableSelector + ' tr').first().clone(true);
  $(treeTableSelector).prepend(firstQuestion);
}

function setAssessmentPath() {
  var path = "";

  // get selected buttons
  $('#treeTable .question .btn-primary').each(function (ndx) {
    if ($(this).text()) {
      path = $(this).text() + ", " + path;
    }
  });

  if (myPMFAssessmentRef) {
    myPMFAssessmentRef.update({
      assessmentPath: path
    });
  }
}

function setCurrentPhase(result) {
  // is a final assessment visible    
  if (myPMFAssessmentRef && result.length > 0) {
    var text = result.first().text().toLowerCase();
    var phase;

    if (text.indexOf("finding early adopters") != -1) {
      phase = "Finding Early Adopters";
    } else if (text.indexOf("offer testing") != -1) {
      phase = "Offer Testing";
    } else if (text.indexOf("currency testing") != -1) {
      phase = "Currency Testing";
    } else if (text.indexOf("utility testing") != -1) {
      phase = "Utility Testing";
    } else if (text.indexOf("scaling") != -1) {
      phase = "Scaling";
    }

    myPMFAssessmentRef.update({
      currentPhase: phase
    });
  }
}