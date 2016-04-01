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

  timeout: [],     // store setTimout id
  mjRunning: [],  // true when MathJax is processing
  oldtext: [],     // used to check if an update is needed

  index: null,
  length: null,

  //
  //  Get the preview and buffer DIV's
  //
  Init: function () {
    this.preview = document.getElementsByClassName("markjax-preview");
    this.buffer = document.getElementsByClassName("markjax-preview-buffer");
    this.textarea = document.getElementsByClassName("markjax-input");

    this.length = this.preview.length;
    for (var i = 0; i < this.length; i++) {
      this.preview[i].setAttribute("markjax-index", i);
      this.buffer[i].setAttribute("markjax-index", i);
      this.textarea[i].setAttribute("markjax-index", i);
    }
  },

  //
  //  Switch the buffer and preview, and display the right one.
  //  (We use visibility:hidden rather than display:none since
  //  the results of running MathJax are more accurate that way.)
  //
  SwapBuffers: function (index) {
    this.preview[index].innerHTML = this.buffer[index].innerHTML
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
    if (this.timeout[this.index]) {
      clearTimeout(this.timeout[this.index]);
    }

    this.timeout[this.index] = setTimeout(MathJax.Callback(["CreatePreview", Preview, this.index]), this.delay);
  },

  UpdateAll: function () {
    for (var i = 0; i < this.length; i++) {
      this.index = i;
      this.Update();
    }
  },

  //
  //  Creates the preview and runs MathJax on it.
  //  If MathJax is already trying to render the code, return
  //  If the text hasn't changed, return
  //  Otherwise, indicate that MathJax is running, and start the
  //    typesetting.  After it is done, call PreviewDone.
  //
  CreatePreview: function (index) {
    this.timeout[index] = null;
    if (this.mjRunning[index]) {
      return;
    }

    var text;
    if (this.textarea[index].classList.contains("markjax-editor")) {
      text = this.textarea[index].value;
    } else {
      text = this.textarea[index].innerHTML;
    }

    if (text === this.oldtext[index]) {
      return;
    }

    text = this.Escape(text);                       //Escape tags before doing stuff
    this.buffer[index].innerHTML = this.oldtext[index] = text;
    this.mjRunning[index] = true;
    MathJax.Hub.Queue(
      ["Typeset", MathJax.Hub, this.buffer[index]],
      ["PreviewDone", this, index],
      ["resetEquationNumbers", MathJax.InputJax.TeX]
    );
  },

  //
  //  Indicate that MathJax is no longer running,
  //  do markdown over MathJax's result,
  //  and swap the buffers to show the results.
  //
  PreviewDone: function (index) {
    this.mjRunning[index] = false;
    text = this.buffer[index].innerHTML;
    // replace occurrences of &gt; at the beginning of a new line
    // with > again, so Markdown blockquotes are handled correctly
    text = text.replace(/^&gt;/mg, '>');
    text = text.replace(/&lt;/mg, '<');  // <
    text = text.replace(/&gt;/mg, '>');  // >
    this.buffer[index].innerHTML = marked (text);
    this.SwapBuffers(index);
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
      this.preview[this.index].innerHTML = '<p>' + marked(this.textarea[this.index].value) + '</p>';
      this.buffer[this.index].innerHTML = '<p>' + marked(this.textarea[this.index].value) + '</p>';
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
  Preview.UpdateAll();

  autosize($("textarea.markjax-editor.markjax-input"));

  $(".markjax-editor.markjax-input").on("keyup", function(){
    Preview.index = parseInt(this.getAttribute("markjax-index"));
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
