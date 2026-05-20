function bindKey(keyboard, event, handler, bindings) {
  keyboard.on(event, handler);
  bindings.push(() => keyboard.off(event, handler));
}

function bindPointer(input, event, handler, bindings) {
  input.on(event, handler);
  bindings.push(() => input.off(event, handler));
}

export function createInputAdapter(options) {
  const {
    input,
    keyboard,
    onJump,
    onConfirm,
    onDeflect,
    onToggleLeaderboard,
    onCloseLeaderboard,
    onBackspace,
    onKey,
    isDeflectWindowOpen,
  } = options;

  const unbind = [];

  bindKey(keyboard, "keydown-SPACE", onJump, unbind);
  bindKey(
    keyboard,
    "keydown-ENTER",
    () => {
      if (isDeflectWindowOpen()) {
        onDeflect();
        return;
      }
      onConfirm();
    },
    unbind,
  );
  bindKey(
    keyboard,
    "keydown-RETURN",
    () => {
      if (isDeflectWindowOpen()) {
        onDeflect();
        return;
      }
      onConfirm();
    },
    unbind,
  );
  bindKey(keyboard, "keydown-L", onToggleLeaderboard, unbind);
  bindKey(keyboard, "keydown-ESC", onCloseLeaderboard, unbind);
  bindKey(keyboard, "keydown-BACKSPACE", onBackspace, unbind);
  bindKey(keyboard, "keydown", onKey, unbind);

  // Touch/mouse: tap to jump; release to trigger deflect window or confirm action.
  bindPointer(input, "pointerdown", onJump, unbind);
  bindPointer(
    input,
    "pointerup",
    () => {
      if (isDeflectWindowOpen()) {
        onDeflect();
        return;
      }
      onConfirm();
    },
    unbind,
  );

  return {
    destroy() {
      while (unbind.length > 0) {
        const dispose = unbind.pop();
        dispose();
      }
    },
  };
}

