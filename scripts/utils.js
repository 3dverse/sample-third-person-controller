//------------------------------------------------------------------------------
export async function lockPointer() {
    const canvas = document.getElementById("display-canvas");
    canvas.removeEventListener('mousedown', lockPointer);

    canvas.requestPointerLock = (
        canvas.requestPointerLock 
        || canvas.mozRequestPointerLock 
        || canvas.webkitPointerLockElement
    );
    await canvas.requestPointerLock();
    // Focusing the canvas is necessary to make user's inputs work since most
    // user inputs are detected through Web "onkeydown" Event Listeners
    // attached to the canvas.
    canvas.focus();
    canvas.addEventListener('mouseup', unlockPointer);
}

//------------------------------------------------------------------------------
export async function unlockPointer() {
    const canvas = document.getElementById("display-canvas");
    canvas.removeEventListener('mouseup', unlockPointer);
    
    document.exitPointerLock = (
      document.exitPointerLock 
        || document.mozExitPointerLock 
        || document.webkitExitPointerLock
    );
    await document.exitPointerLock();
    canvas.addEventListener('mousedown', lockPointer);
}

//------------------------------------------------------------------------------
export function getGamepadsCount() {
    let gamepadCount = 0;
    navigator.getGamepads().forEach(
        (gamepad) => { 
            if(gamepad !== null){
                gamepadCount++
            } 
        }
    );
    return gamepadCount;
}