//------------------------------------------------------------------------------
import {
    lockPointer,
    getGamepadsCount
} from "./utils.js";

//------------------------------------------------------------------------------
let device = "mouse";
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
export function initControlKeySettings() {
    const actionKeysElements = document.getElementsByClassName("action-keys");
    let action, displayedKeys;
    Array.from(actionKeysElements).forEach(async (element) => {
        action = element.getAttribute("data-action");  
        displayedKeys = '';
        for (const key of PHYSICAL_ACTION_KEYS[action]) {
            displayedKeys += (await getActionKey(key)) + " + ";
        }
        displayedKeys = displayedKeys.slice(0, -3);
        element.innerHTML = displayedKeys;
    });
}

//------------------------------------------------------------------------------
export function adjustDeviceSensitivity(characterController) {
    // We recover the device and the sensitivity from the settings modal inputs.
    const sensitivitySetting = getSensitivity();
    
    // We adjust the sensitivity depending on the device. The joysticks on 
    // gamepads produce less sensitive values than the mouse. The new 
    // sensitivity for gamepad has to be higher. Around ~0.x sensitivity for 
    // mouse and ~x.0 for gamepad within the current asset script for character 
    // controller camera management.
    let newSensitivity;
    if(device ===  "gamepad"){
        newSensitivity = sensitivitySetting / 5;
    } else { //if(device === "mouse"){
        newSensitivity = sensitivitySetting / 100;
    }

    // We update the inputs of the Asset Script attached to the character 
    // controller, specifically the sensitivity. Asset Scripts inputs are 
    // accessed through the "script_map" component of an entity.
    const characterControllerScriptUUID = Object.keys(characterController.getComponent("script_map").elements)[0];
    characterController.setScriptInputValues(
        characterControllerScriptUUID, 
        {
            sensitivity: newSensitivity,
        }
    );
}

//------------------------------------------------------------------------------
function getSensitivity() {
    return document.getElementById("sensitivity-slider").value;
}

//------------------------------------------------------------------------------
function getActionKey(physicalActionKey) {
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
export function initDeviceDetection(characterController) {
    detectMouse(characterController);
    detectGamepad(characterController);
}

//------------------------------------------------------------------------------
function detectGamepad(characterController) {
    window.addEventListener(
        'gamepadconnected',
        () => {
            if(getGamepadsCount() === 1){
                // When the first gamepad is connected, it means the last 
                // detectMouse() didn't activate detectGamepadActions(). 
                detectGamepadActions(characterController);
            }
        }
    );
    window.addEventListener(
        'gamepaddisconnected',
        () => {
            if(getGamepadsCount() === 0){
                // When the last gamepad is disconnected, we force the 
                // detectGamepadActions loop to stop.
                device = 'gamepad';
            }
        }
    );
}

//------------------------------------------------------------------------------
async function detectGamepadActions(characterController) {
    let gamepads;
    while(device !== 'gamepad')
    {
        gamepads = navigator.getGamepads();
        for (const gamepad of gamepads){
            if(!gamepad) continue;
            for (const axis of gamepad?.axes){
                if(Math.abs(axis) > GAMEPAD_DETECTION_DEADZONE)
                {
                    device = 'gamepad';
                    adjustDeviceSensitivity(characterController);
                    return;
                }
            }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

//------------------------------------------------------------------------------
function detectMouse(characterController) {
    const canvas = document.getElementById("display-canvas");
    canvas.addEventListener(
        'mousedown', 
        () => { 
            lockPointer();
            if( device === 'mouse') return;
            device = 'mouse';
            adjustDeviceSensitivity(characterController);
            if(getGamepadsCount() > 0){
                detectGamepadActions(characterController);
            }
        }
    );
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
    adjustDeviceSensitivity(characterController);
}