// script.js
$(document).ready(function () {
  // --- state ---
  let notes = JSON.parse(localStorage.getItem("notes")) || []; // persisted notes
  let currentNoteIndex = null;   // index of note currently being viewed/edited
  let editing = false;           // whether we are editing (true) or creating (false)

  // --- helpers ---
  function saveNotes() {
    localStorage.setItem("notes", JSON.stringify(notes));
  }

  // Create contrast color (white or black) for icons based on any CSS color string
  function getContrastColor(cssColor) {
    // Create a temporary element to resolve named colors to rgb
    let el = document.createElement("div");
    el.style.display = "none";
    el.style.backgroundColor = cssColor;
    document.body.appendChild(el);
    let computed = getComputedStyle(el).backgroundColor; // e.g. "rgb(255, 0, 0)"
    document.body.removeChild(el);

    let m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) {
      return "black";
    }
    let r = +m[1], g = +m[2], b = +m[3];
    // Perceived luminance
    let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum < 140 ? "white" : "black"; // threshold tuned for readability
  }

  // Ensure save button exists in create view; if not, inject it (icon-only)
  function ensureSaveButton() {
    if ($("#save-note").length === 0) {
      // Place the save button AFTER the color input if it exists, otherwise append to create view
      const $btn = $('<button id="save-note" title="Save note" aria-label="Save note"><i class="fa fa-save"></i></button>');
      if ($("#note-color").length) {
        $("#note-color").after($btn);
      } else {
        $("#create-note-view").append($btn);
      }
      // Optional small style hook (so JS-inserted button won't be invisible if CSS expects .save-btn)
      $btn.css({
        cursor: "pointer",
        marginTop: "8px",
        padding: "8px 10px",
      });
    }
  }

  // Render notes list on home view
  function renderNotes() {
    const $list = $("#notes-list");
    $list.empty();

    if (!notes.length) {
      $list.html('<p>No notes yet. Create 😊 one.</p>');
      return;
    }

    notes.forEach((note, idx) => {
      // Build card (keep content short in grid)
      const contentPreview = (note.content && note.content.trim()) ? note.content : "Nothing here yet";
      const $card = $(`
        <div class="note" data-idx="${idx}" style="background:${note.color || '#ffffff'}">
          <h5 class="note-title">${note.title}</h5>
          <div class="note-content">${contentPreview}</div>
        </div>
      `);

      $card.on("click", function () {
        openNoteView(idx);
      });

      $list.append($card);
    });
  }

  // Open fullscreen note view for a note index
  function openNoteView(index) {
    if (index == null || !notes[index]) return;
    currentNoteIndex = index;
    const note = notes[index];

    // Fill content & background
    $("#fullscreen-note-title").text(note.title || "");
    $("#fullscreen-note-content").text(note.content || "Nothing here yet");
    $("#view-note-view").css("background-color", note.color || "#ffffff");

    // Make icons (FontAwesome <i> tags) readable against the background
    const iconColor = getContrastColor(note.color || "#ffffff");
    // target any icons inside the note view nav and go-back if icon exists
    $("#view-note-view nav button i, #view-note-view .go-back i, #view-note-view .go-back").css("color", iconColor);
    $("#view-note-view nav button i").css("color", iconColor);

    // Also style the go-back button text/icon color
    $("#view-note-view .go-back").css("color", iconColor);

    // Show view
    $("#home-view, #create-note-view").hide();
    $("#view-note-view").show();
    editing = false; // not editing until user presses edit
  }

  // --- UI actions / wiring ---

  // Ensure the save button exists now (in case HTML omitted it)
  ensureSaveButton();

  // Initial render
  renderNotes();

  // NEW (create) button action -> open create view blank
  $("#new").on("click", function () {
    editing = false;
    currentNoteIndex = null;
    $("#note-title-input").val("");
    $("#note-content-input").val("");
    if ($("#note-color").length) $("#note-color").val("#ffffff");
    $("#home-view, #view-note-view").hide();
    $("#create-note-view").show();
    ensureSaveButton(); // ensure visible if someone removed it
  });

  // BACK buttons
  $(document).on("click", ".go-back", function () {
    // cancel any edit-create operation
    editing = false;
    currentNoteIndex = null;
    $("#create-note-view, #view-note-view").hide();
    $("#home-view").show();
  });

  // SAVE (create or edit)
  $(document).on("click", "#save-note", function (e) {
    e.preventDefault();
    // Read inputs
    const title = ($("#note-title-input").val() || "").trim();
    const content = ($("#note-content-input").val() || "").trim();
    const color = ($("#note-color").val() || "#ffffff").trim();

    if (!title) {
      alert("Please enter a title for your note.");
      return;
    }

    if (editing && currentNoteIndex !== null && notes[currentNoteIndex]) {
      // update existing
      notes[currentNoteIndex].title = title;
      notes[currentNoteIndex].content = content;
      notes[currentNoteIndex].color = color;
    } else {
      // create new
      notes.push({ title: title, content: content, color: color });
    }

    // persist & re-render
    saveNotes();
    renderNotes();

    // return to home view
    editing = false;
    currentNoteIndex = null;
    $("#create-note-view").hide();
    $("#home-view").show();
  });

  // EDIT from fullscreen view: prefill and switch to create view
  $(document).on("click", "#edit-note", function () {
    if (currentNoteIndex == null || !notes[currentNoteIndex]) return;
    const note = notes[currentNoteIndex];
    // Prefill fields
    $("#note-title-input").val(note.title || "");
    $("#note-content-input").val(note.content || "");
    if ($("#note-color").length) $("#note-color").val(note.color || "#ffffff");
    // Switch to create view and set editing mode
    editing = true;
    $("#view-note-view").hide();
    $("#create-note-view").show();
    ensureSaveButton();
  });

  // CHANGE BG COLOR from fullscreen view — open native color picker
  $(document).on("click", "#change-bgcolor", function () {
    if (currentNoteIndex == null || !notes[currentNoteIndex]) return;
    // create a temporary color input, attach to body so it can open the picker
    const $picker = $('<input type="color" style="position:fixed;left:-9999px;">');
    $("body").append($picker);
    $picker.val(notes[currentNoteIndex].color || "#ffffff");
    $picker.on("input change", function () {
      const newColor = $(this).val();
      notes[currentNoteIndex].color = newColor;
      saveNotes();
      renderNotes();
      openNoteView(currentNoteIndex); // refresh view & icon contrast
      $picker.remove();
    });
    // trigger color dialog
    $picker.trigger("click");
    // fallback removal if user cancels without change
    setTimeout(() => $picker.remove(), 3000);
  });

  // DELETE note from fullscreen view
  $(document).on("click", "#delete-note", function () {
    if (currentNoteIndex == null) return;
    if (!confirm("Delete this note?")) return;
    notes.splice(currentNoteIndex, 1);
    saveNotes();
    renderNotes();
    currentNoteIndex = null;
    editing = false;
    $("#view-note-view").hide();
    $("#home-view").show();
  });

  // When clicking a card in the list (support dynamic cards)
  $(document).on("click", "#notes-list .note", function () {
    const idx = $(this).data("idx");
    // data-idx may be string, convert to number
    openNoteView(Number(idx));
  });

  // Safeguard: if HTML used different click target (older versions), also handle note div click
  // (renderNotes attaches click handlers already, this is a double-guard)

  // End of document ready
});
