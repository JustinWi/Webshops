$(document).ready(function() {

  $('#qTable a').each(function() {
    var link = $(this);

    if (link.attr("href").toLowerCase().indexOf("customerdevlabs.com/focus") >= 0) {
      link.attr("href", "http://focus.customerdevlabs.com/#focus-framework");
      link.attr("target", "_blank");
    }
  });

  $('#qTable li').on('click', function() {
    //style the selected answer
    $(this).removeClass('btn-default').addClass('btn-primary').siblings("li").removeClass('btn-primary').addClass('btn-default');
    //hide all rows after the currently displayed row and remove selectedAnswer style
    $(this).closest("tr").prevAll("tr").remove();

    //show the next row that matches the question id
    var italNum = $(this).find('i').text();
    var qNextSelector = ' tr:nth-child(' + italNum + ')';
    var nextQuestion = $('#qTable' + qNextSelector).clone(true).hide();

    $('#treeTable').prepend(nextQuestion);
    nextQuestion.fadeIn(800);
  })

  // setup first question
  var firstQuestion = $('#qTable tr').first().clone(true);
  $('#treeTable').prepend(firstQuestion);
})
