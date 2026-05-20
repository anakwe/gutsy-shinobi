import { describe, expect, it, vi } from "vitest";
import { createInputAdapter } from "./inputAdapter";

function makeEmitter() {
  const handlers = new Map();

  return {
    on(event, handler) {
      const current = handlers.get(event) || [];
      handlers.set(event, [...current, handler]);
    },
    off(event, handler) {
      const current = handlers.get(event) || [];
      handlers.set(
        event,
        current.filter((fn) => fn !== handler),
      );
    },
    emit(event, payload) {
      const current = handlers.get(event) || [];
      current.forEach((handler) => handler(payload));
    },
    count(event) {
      return (handlers.get(event) || []).length;
    },
  };
}

describe("inputAdapter", () => {
  it("maps space to jump", () => {
    const input = makeEmitter();
    const keyboard = makeEmitter();
    const onJump = vi.fn();

    createInputAdapter({
      input,
      keyboard,
      onJump,
      onConfirm: vi.fn(),
      onDeflect: vi.fn(),
      onToggleLeaderboard: vi.fn(),
      onCloseLeaderboard: vi.fn(),
      onBackspace: vi.fn(),
      onKey: vi.fn(),
      isDeflectWindowOpen: () => false,
    });

    keyboard.emit("keydown-SPACE");
    expect(onJump).toHaveBeenCalledTimes(1);
  });

  it("routes enter to deflect when deflect window is open", () => {
    const input = makeEmitter();
    const keyboard = makeEmitter();
    const onConfirm = vi.fn();
    const onDeflect = vi.fn();

    createInputAdapter({
      input,
      keyboard,
      onJump: vi.fn(),
      onConfirm,
      onDeflect,
      onToggleLeaderboard: vi.fn(),
      onCloseLeaderboard: vi.fn(),
      onBackspace: vi.fn(),
      onKey: vi.fn(),
      isDeflectWindowOpen: () => true,
    });

    keyboard.emit("keydown-ENTER");
    expect(onDeflect).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(0);
  });

  it("routes pointerup to confirm when deflect window is closed", () => {
    const input = makeEmitter();
    const keyboard = makeEmitter();
    const onConfirm = vi.fn();

    createInputAdapter({
      input,
      keyboard,
      onJump: vi.fn(),
      onConfirm,
      onDeflect: vi.fn(),
      onToggleLeaderboard: vi.fn(),
      onCloseLeaderboard: vi.fn(),
      onBackspace: vi.fn(),
      onKey: vi.fn(),
      isDeflectWindowOpen: () => false,
    });

    input.emit("pointerup");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("unbinds listeners on destroy", () => {
    const input = makeEmitter();
    const keyboard = makeEmitter();
    const adapter = createInputAdapter({
      input,
      keyboard,
      onJump: vi.fn(),
      onConfirm: vi.fn(),
      onDeflect: vi.fn(),
      onToggleLeaderboard: vi.fn(),
      onCloseLeaderboard: vi.fn(),
      onBackspace: vi.fn(),
      onKey: vi.fn(),
      isDeflectWindowOpen: () => false,
    });

    expect(keyboard.count("keydown-SPACE")).toBe(1);
    adapter.destroy();
    expect(keyboard.count("keydown-SPACE")).toBe(0);
  });
});

