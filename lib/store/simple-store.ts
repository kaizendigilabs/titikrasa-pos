import { useSyncExternalStore } from "react";

type Listener = () => void;

export class SimpleStore<TState> {
  public state: TState;
  private listeners = new Set<Listener>();

  constructor(initialState: TState) {
    this.state = initialState;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setState(updater: TState | ((prev: TState) => TState)) {
    const nextState =
      typeof updater === "function"
        ? (updater as (prev: TState) => TState)(this.state)
        : updater;
    this.state = nextState;
    this.listeners.forEach((listener) => listener());
  }
}

export function useStore<TState, TSelected = TState>(
  store: SimpleStore<TState>,
  selector: (state: TState) => TSelected = (state) => state as unknown as TSelected,
) {
  return useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => selector(store.state),
    () => selector(store.state),
  );
}
