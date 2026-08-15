let dragging = false;
const dragEndListeners = new Set<() => void>();

export const isBoardDragging = (): boolean => dragging;

export const setBoardDragging = (value: boolean): void => {
  const wasDragging = dragging;
  dragging = value;
  if (wasDragging && !value) {
    dragEndListeners.forEach((listener) => listener());
  }
};

export const subscribeToDragEnd = (listener: () => void): (() => void) => {
  dragEndListeners.add(listener);
  return (): void => {
    dragEndListeners.delete(listener);
  };
};
