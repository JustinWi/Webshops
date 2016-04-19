var currentStep = -1;
var previousLayout;

$(document).ready(function() {
  $('.prev-button').click(prevStep);
  $('.next-button').click(nextStep);

  $(window).resize(initInstructionDimensions);
});

$(window).load(function() {
  nextStep();
});

function initInstructionDimensions() {
  const INSTRUCTION_RATIO = .8;

  if ($('.worksheet').height() > 0) {
    $('.instructions > .content').css('max-height', $('.worksheet').height() * INSTRUCTION_RATIO);
  }
}

function nextStep() {
  currentStep++;
  setStep();
}

function prevStep() {
  currentStep--;
  setStep();
}

function setStep() {
  initInstructionDimensions();

  var panel = $(".instruction-panel");
  var title = panel.find('.panel-title');
  var content = panel.find('.content');
  var step = $('.step:eq(' + currentStep + ')');
  var wrkshtImg = $('.worksheet img');
  var newLayout = step.attr('layout');
  var fields = step.find('.fields').children();

  panel.fadeOut("slow", function() {
    if (currentStep == 1 && !wrkshtImg.hasClass('fly-in')) {
      wrkshtImg.addClass('transitions');
      wrkshtImg.addClass('fly-in');

      setTimeout(setStep, 1500);
      return;
    }

    var changeImage = step.attr('changeImage');

    if (changeImage != null && wrkshtImg.attr('src') != changeImage) {
      wrkshtImg.removeClass('transitions');

      $('.blank:visible').addClass('comeback').fadeOut("slow");

      wrkshtImg.fadeOut("slow", function() {
        wrkshtImg.attr('src', changeImage);
        wrkshtImg.fadeIn("slow");

        $('.comeback').fadeIn("slow").removeClass('comeback');
      });

      setTimeout(setStep, 1000);
      return;
    }

    title.html(step.find('.title').html() + " <span class='stepNumber'>" + (currentStep + 1) + ' of ' + $('.step').length + "</span>");
    content.html(step.find('.content').html());

    content.find('.lightboxable').attr('data-lightbox', 'step' + currentStep);

    if (newLayout != previousLayout) {
      panel.addClass(newLayout);
      panel.removeClass(previousLayout);

      previousLayout = newLayout;
    }

    fields.each(function() {
      var field = $(this).attr("class");
      $('div.' + field).fadeIn("slow").get(0).focus();
    });

    if (fields.length > 0) {
      var firstField = fields.first().attr('class');
      $('div.' + firstField).get(0).focus();
    }

    if (currentStep == 0) {
      // first step
      $('.prev-button').hide();
      $('.next-button').text("Start");
    }
    else if (currentStep >= $('.step').length - 1) {
      // last step
      $('.next-button').hide();
    }
    else {
      // middle step
      $('.prev-button').show().text('Prev');
      $('.next-button').show().text('Next');
    }

    panel.fadeIn("slow");
  });
}

function swapImage(img) {
  var wrkshtImg = $('.worksheet img');

  wrkshtImg.attr('src', img);
}
