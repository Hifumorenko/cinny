import { isKeyHotkey } from 'is-hotkey';
import { KeyboardEventHandler } from 'react';

export interface KeyboardEventLike {
  key: string;
  which: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  preventDefault(): void;
}

export const onTabPress = (evt: KeyboardEventLike, callback: () => void) => {
  if (isKeyHotkey('tab', evt)) {
    evt.preventDefault();
    callback();
  }
};

export const preventScrollWithArrowKey: KeyboardEventHandler = (evt) => {
  if (isKeyHotkey(['arrowup', 'arrowright', 'arrowdown', 'arrowleft'], evt)) {
    evt.preventDefault();
  }
};

export const onEnterOrSpace =
  <T>(callback: (evt: T) => void) =>
  (evt: KeyboardEventLike) => {
    if (isKeyHotkey('enter', evt) || isKeyHotkey('space', evt)) {
      evt.preventDefault();
      callback(evt as T);
    }
  };

export const stopPropagation = (evt: KeyboardEvent): boolean => {
  const ae = document.activeElement;
  const editableActiveElement = ae
    ? ae.nodeName.toLowerCase() === 'input' ||
      ae.nodeName.toLowerCase() === 'textarea' ||
      ae.getAttribute('contenteditable') === 'true'
    : false;

  if (editableActiveElement) return false;

  evt.stopPropagation();
  return true;
};

export const mouseButtonCode = (button: number): string => `Mouse${button}`;

export const isMouseBind = (binding: string): boolean => binding.startsWith('Mouse');

const mouseButtonLabelMap: Record<number, string> = {
  0: 'Left Click',
  1: 'Middle Click',
  2: 'Right Click',
  3: 'Mouse 4',
  4: 'Mouse 5',
};

const pushKeyLabelMap: Record<string, string> = {
  ControlLeft: 'Ctrl (L)',
  ControlRight: 'Ctrl (R)',
  Escape: 'Esc',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

export const getPushKeyLabel = (binding: string): string => {
  if (isMouseBind(binding)) {
    const button = parseInt(binding.replace('Mouse', ''), 10);
    return mouseButtonLabelMap[button] ?? `Mouse ${button + 1}`;
  }
  if (pushKeyLabelMap[binding]) return pushKeyLabelMap[binding];
  if (binding.includes('Left')) return binding.replace('Left', ' (L)');
  if (binding.includes('Right')) return binding.replace('Right', ' (R)');
  if (/^Key([A-Z])$/.test(binding)) return binding.replace(/^Key/, '');
  if (/^Digit(\d)$/.test(binding)) return binding.replace(/^Digit/, '');
  if (/^Numpad(\d)$/.test(binding)) return `Num ${binding.replace(/^Numpad/, '')}`;
  if (/^F\d{1,2}$/.test(binding)) return binding;
  return binding;
};

const nonCharacterKeys = [
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'Insert',
  'Pause',
  'PrintScreen',
  'ContextMenu',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
];

export const isNonCharacterKey = (code: string): boolean => nonCharacterKeys.includes(code);
