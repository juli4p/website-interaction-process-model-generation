import { registerClickListener } from "./listeners/click-listener.js";
import { registerClipboardListeners } from "./listeners/clipboard-listener.js";
import { registerInputListener } from "./listeners/input-listener.js";
import { registerKeyboardListener } from "./listeners/keyboard-listener.js";
import { registerSelectListener } from "./listeners/select-listener.js";
import { registerSelectorHighlighter } from "./helpers/selector-highlighter.js";
import { registerElementPicker } from "./helpers/element-picker.js";

// has to be registered first to ensure that the element picker can consume clicks before they are recorded
registerElementPicker();

registerClickListener();
registerInputListener();
registerSelectListener();
registerKeyboardListener();
registerClipboardListeners();
registerSelectorHighlighter();
