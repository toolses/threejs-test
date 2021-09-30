import * as THREE from "https://cdn.skypack.dev/three@0.132.2";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/MTLLoader.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/DRACOLoader.js";

function main() {
  const canvas = document.querySelector("#c");

  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.physicallyCorrectLights = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0xcccccc);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMappingExposure = 1;

  const fov = 45;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 10, 20);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 5, 0);
  controls.update();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f2f2f2");

  // PLANE
  {
    const mesh = initPlane();
    //scene.add(mesh);
  }

  // LIGHT
  {
    var light1, light2;
    ({ light1, light2 } = initLightSources());

    scene.add(light1);
    scene.add(light2);
    scene.add(light2.target);
  }

  // MODEL
  {
    initLoaders("gltf")
      .then((root) => {
        scene.add(root);
        // compute the box that contains all the stuff
        // from root and below
        const box = new THREE.Box3().setFromObject(root);

        const boxSize = box.getSize(new THREE.Vector3()).length();
        const boxCenter = box.getCenter(new THREE.Vector3());

        // set the camera to frame the box
        frameArea(boxSize * 1.2, boxSize, boxCenter, camera);

        // update the controls to handle the new size
        controls.maxDistance = boxSize * 10;
        controls.target.copy(boxCenter);
        controls.update();

        updateLabel("Done loading 3D Model!");
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function initLightSources() {
    const skyColor = 0xffffff;
    const intensity = 0.8;
    const light1 = new THREE.AmbientLight(skyColor, intensity);

    const color2 = 0xffffff;
    const intensity2 = 2.5;
    const light2 = new THREE.DirectionalLight(color2, intensity2);

    return { light1, light2 };
  }

  function initLoaders(type) {
    return new Promise((resolve) => {
      switch (type) {
        case "obj":
          initObjLoader(resolve);
          break;
        case "gltf":
          initGltfLoader(resolve, false);
          break;

        default:
          break;
      }
    });
  }

  function initObjLoader(resolve) {
    const mtlLoader = new MTLLoader();
    mtlLoader.load("../resources/horndølbrua.mtl", (mtl) => {
      mtl.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(mtl);
      objLoader.load("../resources/horndølbrua.obj", (root) => {
        resolve(root);
      });
    });
  }

  function initGltfLoader(resolve, decodeCompression) {
    const gltfLoader = new GLTFLoader();

    if (decodeCompression) {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(
        "../node_modules/three/examples/js/libs/draco/"
      );
      gltfLoader.setDRACOLoader(dracoLoader);
    }

    gltfLoader.load(
      "../resources/horndølbrua_2.glb",
      (gltf) => {
        resolve(gltf.scene);
      },
      (p) => {
        console.log(p);
        var loaded = Math.round((p.loaded / p.total) * 100);
        updateLabel(
          `Loading 3D model: ${(p.loaded / 1000000).toFixed(2)} of ${(
            p.total / 1000000
          ).toFixed(2)} (${loaded}%)`
        );

        if (p.loaded == p.total) {
          updateLabel("Rendering 3D model...");
        }
      },
      (e) => {
        updateLabel(e);
        console.log(e);
      }
    );
  }

  function updateLabel(text) {
    const label = document.querySelector("#l");
    label.innerHTML = text;
  }

  function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
    const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
    const halfFovY = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);

    // compute a unit vector that points in the direction the camera is now
    // in the xz plane from the center of the box
    const direction = new THREE.Vector3()
      .subVectors(camera.position, boxCenter)
      .multiply(new THREE.Vector3(1, 0, 1))
      .normalize();

    // move the camera to a position distance units way from the center
    // in whatever direction the camera was from the center already
    camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

    // pick some near and far values for the frustum that
    // will contain the box.
    camera.near = boxSize / 100;
    camera.far = boxSize * 100;

    camera.updateProjectionMatrix();

    // point the camera to look at the center of the box
    camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
  }

  function initPlane() {
    const planeSize = 40;

    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      "https://threejsfundamentals.org/threejs/resources/images/checker.png"
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -0.5;

    return mesh;
  }

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
