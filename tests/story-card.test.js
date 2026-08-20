const test = require("node:test");
const assert = require("node:assert/strict");
const { isLinkedStory, createLongPressToggle } = require("../story-card.js");

test("isLinkedStory is true when the story has a non-empty url (fetched via 최신 뉴스 가져오기)", () => {
  assert.equal(isLinkedStory({ url: "https://www.packers.com/news/x" }), true);
});

test("isLinkedStory is false when url is missing, blank, or not a string", () => {
  assert.equal(isLinkedStory({}), false);
  assert.equal(isLinkedStory({ url: "" }), false);
  assert.equal(isLinkedStory({ url: "   " }), false);
  assert.equal(isLinkedStory({ url: 12345 }), false);
  assert.equal(isLinkedStory(null), false);
  assert.equal(isLinkedStory(undefined), false);
});

test("createLongPressToggle fires onStart only after the delay elapses", () => {
  let timerCallback = null;
  let clearedId = null;
  const fakeSetTimeout = (cb, delay) => {
    timerCallback = cb;
    assert.equal(delay, 500);
    return "timer-1";
  };
  const fakeClearTimeout = (id) => {
    clearedId = id;
  };
  let started = 0;
  let ended = 0;
  const toggle = createLongPressToggle({
    delay: 500,
    onStart: () => started++,
    onEnd: () => ended++,
    setTimeoutFn: fakeSetTimeout,
    clearTimeoutFn: fakeClearTimeout,
  });

  toggle.start();
  assert.equal(started, 0, "onStart must not fire before the timer elapses");
  assert.equal(toggle.isActive(), false);

  timerCallback();
  assert.equal(started, 1);
  assert.equal(toggle.isActive(), true);
  assert.equal(clearedId, null);
});

test("createLongPressToggle cancel() before the delay elapses clears the timer without calling onStart/onEnd", () => {
  let clearedId = null;
  const toggle = createLongPressToggle({
    delay: 500,
    onStart: () => assert.fail("onStart should not fire"),
    onEnd: () => assert.fail("onEnd should not fire when never started"),
    setTimeoutFn: () => "timer-2",
    clearTimeoutFn: (id) => {
      clearedId = id;
    },
  });

  toggle.start();
  toggle.cancel();
  assert.equal(clearedId, "timer-2");
});

test("createLongPressToggle cancel() after activation calls onEnd exactly once", () => {
  let timerCallback = null;
  let started = 0;
  let ended = 0;
  const toggle = createLongPressToggle({
    delay: 500,
    onStart: () => started++,
    onEnd: () => ended++,
    setTimeoutFn: (cb) => {
      timerCallback = cb;
      return "timer-3";
    },
    clearTimeoutFn: () => {},
  });

  toggle.start();
  timerCallback();
  assert.equal(toggle.isActive(), true);

  toggle.cancel();
  assert.equal(ended, 1);
  assert.equal(toggle.isActive(), false);

  toggle.cancel();
  assert.equal(ended, 1, "onEnd should not fire again once already inactive");
});

test("createLongPressToggle start() called twice restarts the timer instead of stacking callbacks", () => {
  const clearedIds = [];
  let secondTimerCallback = null;
  let calls = 0;
  const toggle = createLongPressToggle({
    delay: 500,
    onStart: () => calls++,
    onEnd: () => {},
    setTimeoutFn: (cb) => {
      secondTimerCallback = cb;
      return "timer-" + (clearedIds.length + 1);
    },
    clearTimeoutFn: (id) => clearedIds.push(id),
  });

  toggle.start();
  toggle.start();
  secondTimerCallback();
  assert.equal(calls, 1);
  assert.deepEqual(clearedIds, ["timer-1"]);
});

test("createLongPressToggle defaults to a 500ms delay when none is given", () => {
  let capturedDelay = null;
  const toggle = createLongPressToggle({
    onStart: () => {},
    onEnd: () => {},
    setTimeoutFn: (cb, delay) => {
      capturedDelay = delay;
      return "t";
    },
    clearTimeoutFn: () => {},
  });
  toggle.start();
  assert.equal(capturedDelay, 500);
});
