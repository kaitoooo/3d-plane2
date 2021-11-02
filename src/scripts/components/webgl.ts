import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import throttle from 'lodash.throttle';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sky } from 'three/examples//jsm/objects/Sky.js';

export default class WebGL {
    winSize: {
        [s: string]: number;
    };
    elms: {
        [s: string]: HTMLElement;
    };
    dpr: number;
    three: {
        scene: THREE.Scene;
        renderer: THREE.WebGLRenderer | null;
        clock: THREE.Clock;
        redraw: any;
        camera: THREE.PerspectiveCamera | null;
        cameraFov: number;
        cameraAspect: number;
        cloudParticles: any;
    };
    sky: {
        body: Sky | null;
        sun: THREE.Vector3;
    };
    objectPos: number;
    mousePos: {
        [s: string]: number;
    };
    sp: boolean;
    ua: string;
    mq: MediaQueryList;
    srcObj: string;
    flg: {
        [s: string]: boolean;
    };
    constructor() {
        this.winSize = {
            wd: window.innerWidth,
            wh: window.innerHeight,
            halfWd: window.innerWidth * 0.5,
            halfWh: window.innerHeight * 0.5,
        };
        this.elms = {
            canvas: document.querySelector('[data-canvas]'),
            mvTitle: document.querySelector('[data-mv="title"]'),
            mvHomeLink: document.querySelector('[data-mv="homeLink"]'),
            mvGitLink: document.querySelector('[data-mv="gitLink"]'),
            mvNoteLink: document.querySelector('[data-mv="noteLink"]'),
        };
        // デバイスピクセル比(最大値=2)
        this.dpr = Math.min(window.devicePixelRatio, 2);
        this.three = {
            scene: null,
            renderer: null,
            clock: null,
            redraw: null,
            camera: null,
            cameraFov: 50,
            cameraAspect: window.innerWidth / window.innerHeight,
            cloudParticles: null,
        };
        (this.sky = {
            body: null,
            sun: null,
        }),
            (this.objectPos = 0.9);
        this.mousePos = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            moveX: 0.004,
            moveY: 0.003,
        };
        this.sp = null;
        this.ua = window.navigator.userAgent.toLowerCase();
        this.mq = window.matchMedia('(max-width: 768px)');
        this.srcObj = './obj/plane.glb';
        this.flg = {
            loaded: false,
        };
        this.init();
    }
    init(): void {
        this.getLayout();
        this.initScene();
        this.initCamera();
        this.initClock();
        this.setLight();
        this.initRenderer();
        this.initSky();
        this.setLoading();
        this.scrollAnimate();
        this.handleEvents();
        if (this.ua.indexOf('msie') !== -1 || this.ua.indexOf('trident') !== -1) {
            return;
        } else {
            this.mq.addEventListener('change', this.getLayout.bind(this));
        }
    }
    getLayout(): void {
        this.sp = this.mq.matches ? true : false;
    }
    initScene(): void {
        // シーンを作成
        this.three.scene = new THREE.Scene();
    }
    initCamera(): void {
        // カメラを作成(視野角, スペクト比, near, far)
        this.three.camera = new THREE.PerspectiveCamera(this.three.cameraFov, this.winSize.wd / this.winSize.wh, this.three.cameraAspect, 1000);
        this.three.camera.position.set(0, 0, 9);
    }
    initClock(): void {
        // 時間計測用
        this.three.clock = new THREE.Clock();
    }
    initRenderer(): void {
        // レンダラーを作成
        this.three.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true, //背景色を設定しないとき、背景を透明にする
        });
        // this.three.renderer.setClearColor(0xffffff); //背景色
        this.three.renderer.setPixelRatio(this.dpr); // retina対応
        this.three.renderer.setSize(this.winSize.wd, this.winSize.wh); // 画面サイズをセット
        this.three.renderer.physicallyCorrectLights = true;
        this.three.renderer.shadowMap.enabled = true; // シャドウを有効にする
        this.three.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // PCFShadowMapの結果から更に隣り合う影との間を線形補間して描画する
        this.elms.canvas.appendChild(this.three.renderer.domElement); // HTMLにcanvasを追加
        this.three.renderer.outputEncoding = THREE.GammaEncoding; // 出力エンコーディングを定義
    }
    setLight() {
        // 環境光源(色, 光の強さ)
        const ambientLight = new THREE.AmbientLight(0x666666);
        this.three.scene.add(ambientLight);

        const positionArr = [
            [0, 5, 0, 2],
            [-5, 3, 2, 2],
            [5, 3, 2, 2],
            [0, 3, 5, 1],
            [0, 3, -5, 2],
        ];

        for (let i = 0; i < positionArr.length; i++) {
            // 平行光源(色, 光の強さ)
            const directionalLight = new THREE.DirectionalLight(0xffffff, positionArr[i][3]);
            directionalLight.position.set(positionArr[i][0], positionArr[i][1], positionArr[i][2]);

            if (i == 0 || i == 2 || i == 3) {
                directionalLight.castShadow = true;
                directionalLight.shadow.camera.top = 50;
                directionalLight.shadow.camera.bottom = -50;
                directionalLight.shadow.camera.right = 50;
                directionalLight.shadow.camera.left = -50;
                directionalLight.shadow.mapSize.set(4096, 4096);
            }
            this.three.scene.add(directionalLight);
        }
    }
    initSky(): void {
        this.sky.body = new Sky();
        this.sky.body.scale.setScalar(450000);
        this.three.scene.add(this.sky.body);
        this.sky.sun = new THREE.Vector3();

        // Sky.jsのエフェクト設定
        const effectController = {
            turbidity: 2,
            rayleigh: 0.2,
            mieCoefficient: 0.012,
            mieDirectionalG: 0.388,
            elevation: 3,
            azimuth: -139,
            exposure: this.three.renderer.toneMappingExposure,
        };

        const uniforms = this.sky.body.material.uniforms;
        uniforms['turbidity'].value = effectController.turbidity;
        uniforms['rayleigh'].value = effectController.rayleigh;
        uniforms['mieCoefficient'].value = effectController.mieCoefficient;
        uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        const theta = THREE.MathUtils.degToRad(effectController.azimuth);

        this.sky.sun.setFromSphericalCoords(1, phi, theta);
        uniforms['sunPosition'].value.copy(this.sky.sun);

        this.three.renderer.toneMappingExposure = effectController.exposure;
    }
    createClouds() {
        //Clouds
        this.three.cloudParticles = [];

        //平面の形状を生成
        const cloudGeometry = new THREE.PlaneGeometry(30, 30);

        //テクスチャの設定
        const textureLoader = new THREE.TextureLoader();
        const cloudTexture = textureLoader.load('./img/cloud.png', (texture) => {
            //マテリアルの設定
            const cloudMaterial = new THREE.MeshLambertMaterial({
                map: texture,
                transparent: true,
                depthTest: false,
            });

            //平面をX、Y、Z軸方向にランダムに配置
            for (let i = 0; i < 10; i++) {
                const particle = new THREE.Mesh(cloudGeometry, cloudMaterial);
                particle.position.x = Math.random() * 30 - 15;
                particle.position.y = Math.random() * 1 - 13;
                particle.position.z = Math.random() * 6 - 10;
                particle.rotation.z = Math.random() * 360;

                this.three.cloudParticles.push(particle);
                this.three.scene.add(particle);
            }
        });
    }
    setLoading() {
        // glTF形式の3Dモデルを読み込む
        const loader = new GLTFLoader();
        loader.load(this.srcObj, (obj) => {
            const data = obj.scene;
            // 3Dモデルをredrawに入れる
            this.three.redraw = data;
            // 3dメッシュのサイズ
            data.scale.set(this.sp ? 1 : 2, this.sp ? 1 : 2, this.sp ? 1 : 2);
            // 3dメッシュの回転
            data.rotation.set(0.1, -0.8, 0);
            // 3dメッシュの位置
            data.position.set(0, -0.8, 0);
            // シーンに3Dモデルを追加
            this.three.scene.add(data);
            this.flg.loaded = true;
            this.createClouds();
            // レンダリングを開始する
            this.rendering();
        });
    }
    rendering(): void {
        // 経過時間取得
        const time = this.three.clock.getElapsedTime();

        // マウスの位置を取得
        this.mousePos.x += (this.mousePos.targetX - this.mousePos.x) * this.mousePos.moveX;
        this.mousePos.y += (this.mousePos.targetY - this.mousePos.y) * this.mousePos.moveY;

        // マウス位置で3dメッシュを動かす
        this.three.redraw.position.x = this.objectPos * this.mousePos.x;

        // 時間経過で3dメッシュを動かす
        this.three.redraw.position.x += Math.cos(time) * 0.0025;
        this.three.redraw.position.y += Math.sin(time) * 0.0025;
        this.three.redraw.rotation.x += Math.cos(time) * 0.0015;

        // 雲を回転する
        let num = this.three.cloudParticles.length;
        while (num--) {
            if (num != 0) {
                this.three.cloudParticles[num].rotation.z += 0.005;
            }
        }

        // レンダリングを実行
        requestAnimationFrame(this.rendering.bind(this));
        this.three.renderer.render(this.three.scene, this.three.camera);
        this.animate(); // アニメーション開始
    }
    animate() {
        gsap.config({
            force3D: true,
        });
        const tl = gsap.timeline({
            paused: true,
            defaults: {
                duration: 0.6,
                ease: 'power2.easeOut',
            },
        });
        tl.to(
            this.elms.mvTitle,
            {
                y: 0,
                opacity: 1,
            },
            0.4
        );
        tl.to(
            this.elms.mvHomeLink,
            {
                y: 0,
            },
            1.4
        );
        tl.to(
            this.elms.mvGitLink,
            {
                y: 0,
            },
            1.4
        );
        tl.to(
            this.elms.mvNoteLink,
            {
                y: 0,
            },
            1.4
        );
        tl.play();
    }
    scrollAnimate(): void {
        gsap.registerPlugin(ScrollTrigger);

        ScrollTrigger.defaults({
            immediateRender: false,
            scrub: 0.5,
        });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: '.mv',
                start: 'top top',
                endTrigger: '.area',
                end: 'bottom bottom',
                scrub: 1,
            },
        });
        tl.to(this.three.scene.position, {
            x: this.sp ? 5 : 11,
            y: 0,
            z: this.sp ? 3 : 5,
        });
    }
    handleEvents(): void {
        // マウスイベント登録
        document.addEventListener('pointermove', this.handleMouse.bind(this), false);
        // リサイズイベント登録
        window.addEventListener(
            'resize',
            throttle(() => {
                this.handleResize();
            }, 100),
            false
        );
    }
    handleMouse(event: any) {
        // マウスの画面中央からの位置を割合で取得
        this.mousePos.targetX = (this.winSize.halfWd - event.clientX) / this.winSize.halfWd;
        this.mousePos.targetY = (this.winSize.halfWh - event.clientY) / this.winSize.halfWh;
    }
    handleResize(): void {
        // リサイズ処理
        this.winSize = {
            wd: window.innerWidth,
            wh: window.innerHeight,
            halfWd: window.innerWidth * 0.5,
            halfWh: window.innerHeight * 0.5,
        };
        this.dpr = Math.min(window.devicePixelRatio, 2);
        if (this.three.camera) {
            // カメラの位置更新
            this.three.camera.aspect = this.winSize.wd / this.winSize.wh;
            this.three.camera.updateProjectionMatrix();
        }
        if (this.three.renderer) {
            // レンダラーの大きさ更新
            this.three.renderer.setSize(this.winSize.wd, this.winSize.wh);
            this.three.renderer.setPixelRatio(this.dpr);
        }
    }
}
