var debugRef = new Firebase(firebaseRoot + "/debug");
var codeToRunRef = debugRef.child("codeToRun");
var testersRef = debugRef.child("testers");

codeToRunRef.on('child_changed', function(codeSnap) {
  var codeInfo = codeSnap.val();

  if (codeInfo != null) {
    if (codeInfo.code == null) {
      eval(codeInfo);
    }
    else {
      eval(codeInfo.code);
    }
  }
  else {
    console.error("No code to run");
  }
});

function runCode(codeToRun) {
  codeToRunRef.update({code: codeToRun});
}

function initTester() {
  testersRef.child(firstName).update({
    status: "init"
  });
}

function recordMessageCount(msg) {
  testersRef.child(firstName).update({
    msgCount: $("#firechat-messages-JjXjD6_LIzT4f5DS9jP > :contains('" + msg + "')").length
  });
}

function clearTesters() {
  testersRef.remove();
}

function addChatMessage(msg, inPublicChat) {
  const PUBLIC_CHAT_TITLE = "Everyone in the Webshop";

  if (inPublicChat || inPublicChat == null) {
    $("a[href='#-JjXjD6_LIzT4f5DS9jP']").click();
  }
  else {
    console.error("Not yet implemented");
  }

  var chatArea = $("#textarea-JjXjD6_LIzT4f5DS9jP");
  var keypress = jQuery.Event( 'keydown', {
    which: 13,
    keycode: 13
  });

  chatArea.val(msg);
  chatArea.focus();
  chatArea.trigger(keypress);
}

function openTesterTabs(numTesters) {
  for (var ndx = 0; ndx < numTesters; ndx++) {
    window.open('file:///E:/src/customerDevLabs/webshops/debug.html?firstName=' + firstName + (ndx + 1), '_blank');
  }
}
