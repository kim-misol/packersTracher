// Pure, DOM-free logic for the storyline card hover/link feature.
// Loaded as a plain <script> in index.html (window.StoryCard) and required
// directly by tests/story-card.test.js (module.exports) — same file, no
// build step either way.
(function (root, factory) {
  const mod = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = mod;
  } else {
    root.StoryCard = mod;
  }
})(typeof self !== "undefined" ? self : this, function () {
  // A story only gets the hover-to-link treatment when it carries a url —
  // which today only happens for stories pulled in via "최신 뉴스 가져오기"
  // (see api/_lib/claude.js buildOrganizePrompt). Manually-written/legacy
  // stories simply have no url field, so they fall back to plain cards.
  function isLinkedStory(story) {
    return !!story && typeof story.url === "string" && story.url.trim().length > 0;
  }

  // Desktop hover is handled entirely by CSS (:hover). Touch devices have no
  // persistent hover, so a long press on the card is treated as "hovering":
  // holding past `delay` ms fires onStart (apply the hover-look class);
  // releasing/cancelling fires onEnd once, if it had actually started.
  function createLongPressToggle(opts) {
    opts = opts || {};
    const delay = typeof opts.delay === "number" ? opts.delay : 500;
    const onStart = opts.onStart || function () {};
    const onEnd = opts.onEnd || function () {};
    const setTimeoutFn = opts.setTimeoutFn || setTimeout;
    const clearTimeoutFn = opts.clearTimeoutFn || clearTimeout;

    let timerId = null;
    let active = false;

    function start() {
      if (timerId !== null) clearTimeoutFn(timerId);
      timerId = setTimeoutFn(function () {
        timerId = null;
        active = true;
        onStart();
      }, delay);
    }

    function cancel() {
      if (timerId !== null) {
        clearTimeoutFn(timerId);
        timerId = null;
      }
      if (active) {
        active = false;
        onEnd();
      }
    }

    function isActive() {
      return active;
    }

    return { start: start, cancel: cancel, isActive: isActive };
  }

  return {
    isLinkedStory: isLinkedStory,
    createLongPressToggle: createLongPressToggle,
  };
});
