//------------------------------------------------------------------------------
import {
    lockPointer,
    getGamepadsCount
} from "./utils.js";

//------------------------------------------------------------------------------
let deviceListeners = {
    detectGamepadInterval: null,
    onMouseDetected: null,
    onArrowKeysDetected: null
}

const PHYSICAL_ACTION_KEYS = {
    "LOOK_AROUND": ["LEFT CLICK", "MOUSE MOVE"],
    "MOVE_FORWARD": ["KeyW"],
    "MOVE_BACKWARD": ["KeyS"],
    "MOVE_LEFT": ["KeyA"],
    "MOVE_RIGHT": ["KeyD"],
    "DANCE": ["KeyE"],
    "JUMP": ["SPACE"],
    "SPRINT": ["SHIFT"],
}
const GAMEPAD_DETECTION_DEADZONE = 0.2;

// If the browser supports keyboard layout detection, we display layout based 
// keys instead of physical keys.
if ('keyboard' in navigator && 'getLayoutMap' in navigator.keyboard) {
    getActionKey = getLayoutBasedActionKey;
}

//------------------------------------------------------------------------------
// We iterate over the action keys elements and set the DOM Elements from 
// the settings modal to the corresponding keys based on the keyboard layout
// map if available.
export async function initControlKeySettings() {
    const actionKeysElements = document.getElementsByClassName("action-keys");
    let action, actionKeysPromises, actionKeys, displayedKeys;
    for(const element of actionKeysElements){
        action = element.getAttribute("data-action");  
        actionKeysPromises = PHYSICAL_ACTION_KEYS[action].map(getActionKey);
        actionKeys = await Promise.all(actionKeysPromises);
        displayedKeys = actionKeys.join(' + ');
        element.textContent = displayedKeys;
    };
}

//------------------------------------------------------------------------------
export function initDeviceDetection(characterController) {
    //--------------------------------------------------------------------------
    // The default device is the mouse, so other devices detection are 
    // initialized.
    detectGamepadConnection(characterController);
    detectArrowKeys(characterController);
    //--------------------------------------------------------------------------
    // If a gamepad is already connected when the app starts, we directly start
    // the gamepad detection.
    if(getGamepadsCount() > 0){
        detectGamepadActions(characterController);
    }
}

//------------------------------------------------------------------------------
function detectMouse(characterController) {
    if(deviceListeners.onMouseDetected !== null) {
        cancelMouseDetection();
    }
    deviceListeners.onMouseDetected = () => onMouseDetected(characterController);
    const canvas = document.getElementById("display-canvas");
    canvas.addEventListener('mousedown', deviceListeners.onMouseDetected);
}

//------------------------------------------------------------------------------
function cancelMouseDetection() {
    const canvas = document.getElementById("display-canvas");
    canvas.removeEventListener('mousedown', deviceListeners.onMouseDetected);
    deviceListeners.onMouseDetected = null;
}

//------------------------------------------------------------------------------
function onMouseDetected(characterController) { 
    lockPointer();
    adjustDeviceSensitivity("mouse", characterController);

    //-------------------------------------------------------------------------
    // Disable the detection for the current device and enable the detection
    // for devices that require a different sensitivity than the current one.
    cancelMouseDetection();
    if(getGamepadsCount() > 0){
        detectGamepadActions(characterController);
    }
    detectArrowKeys(characterController);
}

//------------------------------------------------------------------------------
function detectGamepadConnection(characterController) {
    //--------------------------------------------------------------------------
    window.addEventListener(
        'gamepadconnected',
        () => {
            //------------------------------------------------------------------
            // If a gamepad actions detection interval is not running, we start
            // one.
            if(deviceListeners.detectGamepadInterval === null) {
                detectGamepadActions(characterController);
            }         
        }
    );
    //--------------------------------------------------------------------------
    window.addEventListener(
        'gamepaddisconnected',
        () => {
            if(getGamepadsCount() === 0){
                cancelGamepadActionsDetection();
            }
        }
    );
}

//------------------------------------------------------------------------------
function detectGamepadActions(characterController) {
    if(deviceListeners.detectGamepadInterval !== null) {
        cancelGamepadActionsDetection();
    }
    deviceListeners.detectGamepadInterval = setInterval(
        () => onGamepadActionsDetection(characterController), 
        100
    );
}

//------------------------------------------------------------------------------
function cancelGamepadActionsDetection() {
    clearInterval(deviceListeners.detectGamepadInterval);
    deviceListeners.detectGamepadInterval = null;
}

//------------------------------------------------------------------------------
function onGamepadActionsDetection(characterController) {
    // We need to fetch the gamepads on every interval because the axes are 
    // passed by valued and would not be updated.
    const gamepads = navigator.getGamepads()
    for (const gamepad of gamepads){
        if(gamepad === null) continue;
        for (const axis of gamepad.axes){
            // If the axis value is smaller than the deadzone, we skip it.
            if(Math.abs(axis) < GAMEPAD_DETECTION_DEADZONE) continue;
            adjustDeviceSensitivity("gamepad", characterController);

            //------------------------------------------------------------------
            // Disable the detection for the current device and enable the 
            // detection for devices that require a different sensitivity than
            // the current one.
            cancelGamepadActionsDetection();
            cancelArrowKeysDetection();
            detectMouse(characterController);
            return;
            
        }
    }
}

//------------------------------------------------------------------------------
function detectArrowKeys(characterController) {
    if(deviceListeners.onArrowKeysDetected !== null) {
        cancelArrowKeysDetection();
    }
    deviceListeners.onArrowKeysDetected = (event) => onKeyboardDetected(event, characterController);
    window.addEventListener('keydown', deviceListeners.onArrowKeysDetected);
}

//------------------------------------------------------------------------------
function cancelArrowKeysDetection() {
    window.removeEventListener('keydown', deviceListeners.onArrowKeysDetected);
    deviceListeners.onArrowKeysDetected = null
}

//------------------------------------------------------------------------------
function onKeyboardDetected(event, characterController) {
    if(event.key === "ArrowLeft" || event.key === "ArrowRight"){
        adjustDeviceSensitivity("keyboard", characterController);
        cancelArrowKeysDetection();
        cancelGamepadActionsDetection();
        detectMouse(characterController);
    }
}

//------------------------------------------------------------------------------
export function adjustDeviceSensitivity(device, characterController) {
    // Recover the sensitivity from the settings modal inputs.
    const sensitivitySetting = getSensitivity();
    
    //--------------------------------------------------------------------------
    // Adjust the sensitivity depending on the device. The joysticks on 
    // gamepads produce less sensitive values than the mouse. The new 
    // sensitivity for gamepad has to be higher. Around ~0.x sensitivity for 
    // mouse and ~x.0 for gamepad within the current asset script for character 
    // controller camera management.
    let newSensitivity;
    switch(device){
        case "gamepad":
        case "keyboard":
            newSensitivity = sensitivitySetting / 5;
            break;
        case "mouse":
            newSensitivity = sensitivitySetting / 100;
            break;
    }
    console.log(`Sensitivity adjusted for ${device} with value: ${newSensitivity}`);

    //--------------------------------------------------------------------------
    // Update the inputs of the Asset Script attached to the character 
    // controller, specifically the sensitivity. Asset Scripts inputs are 
    // accessed through the "script_map" component of an entity.
    const scriptMap = characterController.getComponent("script_map");
    const characterControllerScriptUUID = Object.keys(scriptMap.elements)[0];
    characterController.setScriptInputValues(
        characterControllerScriptUUID, 
        {
            sensitivity: newSensitivity,
        }
    );
}

//------------------------------------------------------------------------------
// getActionKey is async to match getLayoutBasedActionKey signature.
async function getActionKey(physicalActionKey) {
    return physicalActionKey.replace("Key", "");
}

//------------------------------------------------------------------------------
async function getLayoutBasedActionKey(physicalActionKey) {
    // For none layout affected keys, (Space, Shift, etc.)
    if(!physicalActionKey.includes("Key")) {
        return physicalActionKey;
    }

    const keyboardLayoutMap = await navigator.keyboard.getLayoutMap();
    const layoutActionKey = keyboardLayoutMap.get(physicalActionKey);
    return layoutActionKey ? layoutActionKey.toUpperCase() : "UNKNOWN";
}

//------------------------------------------------------------------------------
export function openSettingsModal() {
    const settingsContainer = document.getElementById("settings-modal").parentNode;
    settingsContainer.classList.add('active');
}

//------------------------------------------------------------------------------
export function closeSettingsModal(characterController) {
    const settingsContainer = document.getElementById("settings-modal").parentNode;
    settingsContainer.classList.remove('active');
    adjustDeviceSensitivity("mouse", characterController);
}

//------------------------------------------------------------------------------
function getSensitivity() {
    return document.getElementById("sensitivity-slider").value;
}