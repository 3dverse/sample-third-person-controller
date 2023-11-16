//------------------------------------------------------------------------------
import {
  publicToken,
  mainSceneUUID,
  characterControllerSceneUUID,
} from "./config.js";

//------------------------------------------------------------------------------
window.addEventListener("load", InitApp);

//------------------------------------------------------------------------------
async function InitApp() {
  await SDK3DVerse.joinOrStartSession({
    userToken: publicToken,
    sceneUUID: mainSceneUUID,
    canvas: document.getElementById("display-canvas"),
    connectToEditor: true,
    startSimulation: "on-assets-loaded",
  });

  await InitThirdPersonController(characterControllerSceneUUID);
}

//------------------------------------------------------------------------------
async function InitThirdPersonController(charCtlSceneUUID) {
  // To spawn an entity we need to create an EntityTempllate and specify the
  // components we want to attach to it. In this case we only want a scene_ref
  // that points to the character controller scene.
  const playerTemplate = new SDK3DVerse.EntityTemplate();
  playerTemplate.attachComponent("scene_ref", { value: charCtlSceneUUID });

  // Passing null as parent entity will instantiate our new entity at the root
  // of the main scene.
  const parentEntity = null;
  // Setting this option to true will ensure that our entity will be destroyed
  // when the client is disconnected from the session, making sure we don't
  // leave our 'dead' player body behind.
  const deleteOnClientDisconnection = true;
  // We don't want the player to be saved forever in the scene, so we
  // instantiate a transient entity.
  // Note that an entity template can be instantiated multiple times.
  // Each instantiation results in a new entity.
  const playerSceneEntity = await playerTemplate.instantiateTransientEntity(
    "Player",
    parentEntity,
    deleteOnClientDisconnection
  );

  // The character controller scene is setup as having two entities at its
  // root: the third person controller and the third person camera.
  const children = await playerSceneEntity.getChildren();
  // Look for them by checking their components
  const thirdPersonController = children.find((child) =>
    child.isAttached("script_map")
  );
  const thirdPersonCamera = children.find((child) =>
    child.isAttached("camera")
  );

  // We need to assign the current client to the third person controller
  // script which is attached to the thirdPersonController entity.
  // This allows the script to know which client inputs it should read.
  SDK3DVerse.engineAPI.assignClientToScripts(thirdPersonController);

  // Finally set the third person camera as the main camera.
  SDK3DVerse.setMainCamera(thirdPersonCamera);
}
