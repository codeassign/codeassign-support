MathJax.Hub.Config({
  showProcessingMessages: false,
  tex2jax: {
    inlineMath: [['$','$'],['\\(','\\)']],
    ignoreClass: ".*",
    processClass: "mathjax"
  },
  TeX: {
    equationNumbers: {
      autoNumber: "AMS"
    }
  }
});

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false, // IMPORTANT, because we do MathJax before markdown,
                   //            however we do escaping in 'CreatePreview'.
  smartLists: true,
  smartypants: false,
  highlight: function (code) {
    return hljs.highlightAuto(code).value;
  }
});

var Preview = {
  delay: 50,        // delay after keystroke before updating

  preview: null,     // filled in by Init below
  buffer: null,      // filled in by Init below

  timeout: null,     // store setTimout id
  mjRunning: false,  // true when MathJax is processing
  oldText: null,     // used to check if an update is needed

  //
  //  Get the preview and buffer DIV's
  //
  Init: function () {
    this.preview = document.getElementsByClassName("markjax-preview")[0];
    this.buffer = document.getElementsByClassName("markjax-preview-buffer")[0];
    this.textarea = document.getElementsByClassName("markjax-input")[0];
  },

  //
  //  Switch the buffer and preview, and display the right one.
  //  (We use visibility:hidden rather than display:none since
  //  the results of running MathJax are more accurate that way.)
  //
  SwapBuffers: function () {
    var t = this.preview;
    this.preview = this.buffer;
    this.buffer = t;

    this.buffer.classList.add("markjax-hidden");
    this.preview.classList.remove("markjax-hidden");
  },

  //
  //  This gets called when a key is pressed in the textarea.
  //  We check if there is already a pending update and clear it if so.
  //  Then set up an update to occur after a small delay (so if more keys
  //    are pressed, the update won't occur until after there has been
  //    a pause in the typing).
  //  The callback function is set up below, after the Preview object is set up.
  //
  Update: function () {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(this.callback, this.delay);
  },

  //
  //  Creates the preview and runs MathJax on it.
  //  If MathJax is already trying to render the code, return
  //  If the text hasn't changed, return
  //  Otherwise, indicate that MathJax is running, and start the
  //    typesetting.  After it is done, call PreviewDone.
  //
  CreatePreview: function () {
    Preview.timeout = null;
    if (this.mjRunning) {
      return;
    }

    var text = this.textarea.value;
    if (text === this.oldtext) {
      return;
    }

    text = this.Escape(text);                       //Escape tags before doing stuff
    this.buffer.innerHTML = this.oldtext = text;
    this.mjRunning = true;
    MathJax.Hub.Queue(
      ["Typeset", MathJax.Hub, this.buffer],
      ["PreviewDone", this],
      ["resetEquationNumbers", MathJax.InputJax.TeX]
    );
  },

  //
  //  Indicate that MathJax is no longer running,
  //  do markdown over MathJax's result,
  //  and swap the buffers to show the results.
  //
  PreviewDone: function () {
    this.mjRunning = false;
    text = this.buffer.innerHTML;
    // replace occurrences of &gt; at the beginning of a new line
    // with > again, so Markdown blockquotes are handled correctly
    text = text.replace(/^&gt;/mg, '>');
    text = text.replace(/&lt;/mg, '<');  // <
    text = text.replace(/&gt;/mg, '>');  // >
    this.buffer.innerHTML = marked (text);
    this.SwapBuffers();
  },

  Escape: function (html, encode) {
    return html
      .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
     .replace(/'/g, '&#39;');
  },

  // The idea here is to perform fast updates. See http://stackoverflow.com/questions/11228558/let-pagedown-and-mathjax-work-together/21563171?noredirect=1#comment46869312_21563171
  // But our implementation is a bit buggy: flickering, bad rendering when someone types very fast.
  //
  // If you want to enable such buggy fast updates, you should
  // add something like  onkeypress="Preview.UpdateKeyPress(event)" to textarea's attributes.
  UpdateKeyPress: function (event) {
    if (event.keyCode < 16 || event.keyCode > 47) {
      this.preview.innerHTML = '<p>' + marked(this.textarea.value) + '</p>';
      this.buffer.innerHTML = '<p>' + marked(this.textarea.value) + '</p>';
    }
    this.Update();
  }
};

//
//  Cache a callback to the CreatePreview action
//
Preview.callback = MathJax.Callback(["CreatePreview", Preview]);
Preview.callback.autoReset = true;  // make sure it can run more than once

$(document).ready(function() {
  Preview.Init();
  Preview.Update();

  autosize($("textarea.markjax-editor.markjax-input"));

  $(".markjax-editor.markjax-input").on("keyup", function(){
    Preview.Update();
  });

  $("textarea.markjax-editor.markjax-input").keydown(function(e) {
    if(e.keyCode === 9) { // tab was pressed
      // get caret position/selection
      var start = this.selectionStart;
      var end = this.selectionEnd;

      var $this = $(this);
      var value = $this.val();

      // set textarea value to: text before caret + tab + text after caret
      $this.val(value.substring(0, start) + "  " + value.substring(end));

      // put caret at right position again (add one for the tab)
      this.selectionStart = this.selectionEnd = start + 2;

      // prevent the focus lose
      e.preventDefault();
    }
  });
});
