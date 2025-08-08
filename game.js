class CrystalCollector {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.spaceship = null;
        this.crystals = [];
        this.asteroids = [];
        this.particles = [];
        this.stars = [];
        
        // Model loader
        this.gltfLoader = new THREE.GLTFLoader();
        this.loadedModels = {
            spaceship: null,
            asteroids: [],
            crystals: []
        };
        this.modelsLoaded = false;
        
        this.score = 0;
        this.level = 1;
        this.baseSpeed = 0.15;
        this.currentSpeed = 0.15;
        this.speedMultiplier = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.lastCollectTime = 0;
        this.isInvulnerable = false;
        this.invulnerableTime = 0;
        
        this.gameState = 'loading';
        this.mousePos = { x: 0, y: 0 };
        this.targetPos = { x: 0, y: 0 };
        this.isBoosting = false;
        this.boostEnergy = 0;
        this.maxBoostEnergy = 100;
        this.lives = 4;
        
        this.gameStartTime = 0;
        this.lastSpeedIncrease = 0;
        this.speedLevel = 1;
        
        this.warpEffect = 0;
        this.targetWarpEffect = 0;
        
        // Ekran titreme değişkenleri
        this.screenShakeIntensity = 0;
        this.screenShakeTime = 0;
        
        this.init();
    }
    
    init() {
        this.setupScene();
        this.createLights();
        this.createStarfield();
        this.loadModels().then(() => {
            this.modelsLoaded = true;
            this.createSpaceship();
            this.setupEventListeners();
            this.hideLoadingScreen();
            this.gameState = 'menu';
            
            // Başlangıçta sahneyi render et (arka plan görünsün)
            this.renderer.render(this.scene, this.camera);
            
            this.animate();
        }).catch(error => {
            console.error('Model yükleme hatası:', error);
            this.hideLoadingScreen();
            alert('Modeller yüklenemedi. Lütfen sayfayı yenileyin.');
        });
    }
    
    loadGLTF(path) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf) => resolve(gltf),
                (progress) => console.log('Yükleniyor...', path),
                (error) => reject(error)
            );
        });
    }
    
    async loadModels() {
        console.log('Modeller yükleniyor...');
        
        try {
            // Uzay gemisi modelini yükle
            const spaceshipGLTF = await this.loadGLTF('https://demoadresi.com/models/spaceship.glb');
            this.loadedModels.spaceship = spaceshipGLTF.scene;
            
            // Uzay gemisi materyallerini ayarla
            this.loadedModels.spaceship.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x0066ff);
                    child.material.emissiveIntensity = 0.2;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            console.log('Uzay gemisi yüklendi');
            
            // Asteroit paketini yükle
            const asteroidsGLTF = await this.loadGLTF('https://demoadresi.com/models/asteroids_pack.glb');
            asteroidsGLTF.scene.traverse((child) => {
                if (child.isMesh) {
                    const asteroidModel = child.clone();
                    // Asteroit materyallerini ayarla
                    asteroidModel.material = asteroidModel.material.clone();
                    asteroidModel.material.roughness = 0.9;
                    asteroidModel.material.metalness = 0.1;
                    asteroidModel.castShadow = true;
                    asteroidModel.receiveShadow = true;
                    this.loadedModels.asteroids.push(asteroidModel);
                }
            });
            console.log(`${this.loadedModels.asteroids.length} asteroit modeli yüklendi`);
            
            // Kristal paketini yükle
            const crystalsGLTF = await this.loadGLTF('https://demoadresi.com/models/crystal_pack_stylized.glb');
            crystalsGLTF.scene.traverse((child) => {
                if (child.isMesh) {
                    const crystalModel = child.clone();
                    // Kristal materyallerini ayarla
                    if (crystalModel.material) {
                        crystalModel.material = crystalModel.material.clone();
                        crystalModel.material.emissive = new THREE.Color(0x00ffff);
                        crystalModel.material.emissiveIntensity = 0.3;
                        crystalModel.material.roughness = 0.2;
                        crystalModel.material.metalness = 0.8;
                        crystalModel.material.transparent = true;
                        crystalModel.material.opacity = 0.9;
                        crystalModel.castShadow = true;
                        crystalModel.receiveShadow = true;
                    }
                    this.loadedModels.crystals.push(crystalModel);
                }
            });
            console.log(`${this.loadedModels.crystals.length} kristal modeli yüklendi`);
            
        } catch (error) {
            console.error('Model yükleme hatası:', error);
            throw error;
        }
    }
    
    setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000033, 50, 200);
        
        // Camera - near plane'i çok küçük yapalım ki objeler kaybolmasın
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.01,
            1000
        );
        this.camera.position.set(0, 10, 30);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.5;
        
        // Canvas'e transition ekleyelim ki titreme smooth olsun
        this.renderer.domElement.style.transition = 'none';
        
        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    createLights() {
        // Ambient light - daha parlak ve canlı
        const ambient = new THREE.AmbientLight(0x6060a0, 2);
        this.scene.add(ambient);
        
        // Main directional light - güneş ışığı
        const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -30;
        dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30;
        dirLight.shadow.camera.bottom = -30;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
        
        // Secondary light - mavi ışık
        const dirLight2 = new THREE.DirectionalLight(0x4080ff, 1.5);
        dirLight2.position.set(-10, 10, -10);
        this.scene.add(dirLight2);
        
        // Third light - pembe/mor ışık
        const dirLight3 = new THREE.DirectionalLight(0xff40ff, 0.8);
        dirLight3.position.set(0, -10, 5);
        this.scene.add(dirLight3);
        
        // Point light for spaceship
        this.shipLight = new THREE.PointLight(0x00ffff, 2, 30);
        this.shipLight.position.set(0, 5, 10);
        this.scene.add(this.shipLight);
        
        // Hemisphere light for overall ambience
        const hemiLight = new THREE.HemisphereLight(0x8080ff, 0xff8040, 0.5);
        this.scene.add(hemiLight);
    }
    
    createStarfield() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const starsVertices = [];
        for (let i = 0; i < 1000; i++) {
            const x = (Math.random() - 0.5) * 200;
            const y = (Math.random() - 0.5) * 200;
            const z = -Math.random() * 100 - 50;
            starsVertices.push(x, y, z);
            
            this.stars.push({
                x, y,
                z: z,
                originalZ: z,
                speed: Math.random() * 0.5 + 0.5
            });
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        this.starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.starField);
    }
    
    createSpaceship() {
        if (!this.loadedModels.spaceship) {
            console.error('Uzay gemisi modeli yüklenmedi!');
            return;
        }
        
        // Uzay gemisini klonla ve sahneye ekle
        this.spaceship = this.loadedModels.spaceship.clone();
        
        // Boyut ve pozisyon ayarları - %50 daha büyük ve daha geride
        this.spaceship.scale.set(0.78, 0.78, 0.78);
        this.spaceship.position.set(0, 0, 18);
        // Uzay gemisini ileri doğru çevir
        this.spaceship.rotation.y = 0;
        
        // Işıldama efekti için ek ışık
        this.spaceship.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(0x0066ff);
                child.material.emissiveIntensity = 0.3;
            }
        });
        
        this.scene.add(this.spaceship);
        
        // Motor parçacıkları
        this.createEngineParticles();
    }
    
    createEngineParticles() {
        const particleGeometry = new THREE.BufferGeometry();
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.3,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        const particleCount = 50;
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i++) {
            positions[i] = 0;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.engineParticles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.engineParticles);
    }
    
    spawnCrystal() {
        if (!this.modelsLoaded || this.loadedModels.crystals.length === 0) return;
        
        // Rastgele bir kristal modeli seç
        const randomIndex = Math.floor(Math.random() * this.loadedModels.crystals.length);
        const crystalModel = this.loadedModels.crystals[randomIndex].clone();
        
        // Kristal wrapper objesi oluştur
        const crystal = new THREE.Group();
        crystal.add(crystalModel);
        
        // Boyut ve pozisyon - MİNİK kristaller
        const scale = Math.random() * 0.01 + 0.008;
        crystal.scale.set(scale, scale, scale);
        crystal.position.set(
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 20,
            -120
        );
        
        // Dönme hızları
        crystal.userData = {
            rotationSpeed: {
                x: Math.random() * 0.02,
                y: Math.random() * 0.02,
                z: Math.random() * 0.02
            },
            collected: false,
            glowIntensity: 0
        };
        
        // Işıldama efekti
        crystal.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.emissive = new THREE.Color(0x00ffff);
                child.material.emissiveIntensity = 0.3 + Math.random() * 0.3;
                child.material.transparent = true;
                child.material.opacity = 0.9;
            }
        });
        
        this.crystals.push(crystal);
        this.scene.add(crystal);
    }
    
    spawnAsteroid() {
        if (!this.modelsLoaded || this.loadedModels.asteroids.length === 0) return;
        
        // Rastgele bir asteroit modeli seç
        const randomIndex = Math.floor(Math.random() * this.loadedModels.asteroids.length);
        const asteroidModel = this.loadedModels.asteroids[randomIndex].clone();
        
        // Asteroit wrapper objesi oluştur
        const asteroid = new THREE.Group();
        asteroid.add(asteroidModel);
        
        // Boyut ve pozisyon - daha büyük asteroidler
        const scale = Math.random() * 0.8 + 0.5;
        asteroid.scale.set(scale, scale, scale);
        asteroid.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 30,
            -100
        );
        
        // Dönme hızları
        asteroid.userData = {
            rotationSpeed: {
                x: Math.random() * 0.01 - 0.005,
                y: Math.random() * 0.01 - 0.005,
                z: Math.random() * 0.01 - 0.005
            },
            size: scale
        };
        
        // Materyal ayarları
        asteroid.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.roughness = 0.9;
                child.material.metalness = 0.1;
            }
        });
        
        this.asteroids.push(asteroid);
        this.scene.add(asteroid);
    }
    
    updateEngineParticles() {
        if (!this.engineParticles || !this.spaceship) return;
        
        const positions = this.engineParticles.geometry.attributes.position.array;
        const particleCount = positions.length / 3;
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Parçacık pozisyonlarını güncelle - arkaya doğru ateş
            positions[i3] = this.spaceship.position.x + (Math.random() - 0.5) * 0.5;
            positions[i3 + 1] = this.spaceship.position.y - 0.5;
            positions[i3 + 2] = this.spaceship.position.z + 1 + Math.random() * 2;
            
            // Boost efekti
            if (this.isBoosting) {
                positions[i3 + 2] += Math.random() * 3;
            }
        }
        
        this.engineParticles.geometry.attributes.position.needsUpdate = true;
        
        // Boost durumuna göre renk ve boyut
        if (this.isBoosting) {
            this.engineParticles.material.color.setHex(0xff00ff);
            this.engineParticles.material.size = 0.5;
        } else {
            this.engineParticles.material.color.setHex(0x00ffff);
            this.engineParticles.material.size = 0.3;
        }
    }
    
    checkCollisions() {
        if (!this.spaceship || this.gameState !== 'playing') return;
        
        // Kristal toplaması
        this.crystals.forEach((crystal, index) => {
            if (crystal.userData.collected) return;
            
            const distance = crystal.position.distanceTo(this.spaceship.position);
            
            // Manyetik çekim mesafesi - daha güçlü ve geniş
            if (distance < 15) {
                // Kristali gemiye doğru çek
                const pullStrength = 0.4 * (1 - distance / 15);
                crystal.position.lerp(this.spaceship.position, pullStrength);
            }
            
            // Toplama mesafesi - daha geniş
            if (distance < 4) {
                this.collectCrystal(crystal, index);
            }
        });
        
        // Asteroit çarpışması
        if (!this.isInvulnerable) {
            this.asteroids.forEach((asteroid, index) => {
                const distance = asteroid.position.distanceTo(this.spaceship.position);
                const collisionThreshold = 2.5 + asteroid.userData.size;
                
                if (distance < collisionThreshold) {
                    this.hitAsteroid(asteroid, index);
                }
            });
        }
    }
    
    collectCrystal(crystal, index) {
        crystal.userData.collected = true;
        
        // Skor ve combo
        const now = Date.now();
        if (now - this.lastCollectTime < 2000) {
            this.combo++;
            if (this.combo > this.maxCombo) {
                this.maxCombo = this.combo;
            }
        } else {
            this.combo = 1;
        }
        this.lastCollectTime = now;
        
        const points = 10 * this.combo * this.level;
        this.score += points;
        
        // Boost enerjisi doldur (her kristal %10 doldurur)
        this.boostEnergy = Math.min(this.boostEnergy + 10, this.maxBoostEnergy);
        
        // Seviye kontrolü - daha düşük eşik
        if (this.score >= this.level * 200) {
            this.levelUp();
        }
        
        // UI güncelle
        this.updateUI();
        
        // Combo göster
        if (this.combo > 1) {
            this.showCombo();
        }
        
        // Toplama efekti
        this.createCollectEffect(crystal.position);
        
        // Kristali kaldır
        this.scene.remove(crystal);
        this.crystals.splice(index, 1);
    }
    
    hitAsteroid(asteroid, index) {
        if (this.isInvulnerable) return;
        
        this.lives--;
        
        if (this.lives <= 0) {
            // Patlama efekti oluştur
            this.createExplosionEffect(this.spaceship.position);
            
            // 3 saniye bekle sonra oyun bitti ekranını göster
            setTimeout(() => {
                this.gameOver();
            }, 3000);
        } else {
            // Hasar efekti
            this.isInvulnerable = true;
            this.invulnerableTime = Date.now();
            
            // Çarpma efekti
            this.createImpactEffect(asteroid.position);
            
            // Hız düşür (3 saniye boyunca %20 yavaşlama)
            this.speedMultiplier *= 0.8;
            setTimeout(() => {
                this.speedMultiplier = 1;
            }, 3000);
            
            // Ekran sarsıntısı
            this.shakeScreen();
        }
        
        // Asteroiti kaldır
        this.scene.remove(asteroid);
        this.asteroids.splice(index, 1);
        
        this.updateUI();
    }
    
    createCollectEffect(position) {
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.1),
                new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.8
                })
            );
            
            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            );
            particle.life = 1;
            
            this.particles.push(particle);
            this.scene.add(particle);
        }
    }
    
    createImpactEffect(position) {
        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.2),
                new THREE.MeshBasicMaterial({
                    color: Math.random() > 0.5 ? 0xff6600 : 0xffaa00,
                    transparent: true,
                    opacity: 1
                })
            );
            
            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.8,
                (Math.random() - 0.5) * 0.8
            );
            particle.life = 1;
            
            this.particles.push(particle);
            this.scene.add(particle);
        }
    }
    
    createExplosionEffect(position) {
        const particleCount = 100;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(Math.random() * 0.3 + 0.1),
                new THREE.MeshBasicMaterial({
                    color: Math.random() > 0.5 ? 0xff0000 : (Math.random() > 0.5 ? 0xff6600 : 0xffff00),
                    transparent: true,
                    opacity: 1
                })
            );
            
            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            particle.life = 1;
            
            this.particles.push(particle);
            this.scene.add(particle);
        }
        
        // Uzay gemisini gizle
        if (this.spaceship) {
            this.spaceship.visible = false;
        }
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Pozisyon güncelle
            particle.position.add(particle.velocity);
            
            // Hız azalt
            particle.velocity.multiplyScalar(0.98);
            
            // Yaşam azalt
            particle.life -= deltaTime * 2;
            particle.material.opacity = particle.life;
            
            // Boyut küçült
            particle.scale.multiplyScalar(0.98);
            
            // Ölü parçacıkları kaldır
            if (particle.life <= 0) {
                this.scene.remove(particle);
                this.particles.splice(i, 1);
            }
        }
    }
    
    shakeScreen() {
        // Çarpışma anında EKSTRA güçlü titreme
        this.screenShakeIntensity = 5;
        this.screenShakeTime = 0.8; // 800ms ekstra titreme
    }
    
    levelUp() {
        this.level++;
        this.baseSpeed = Math.min(this.baseSpeed * 1.1, 0.5);
        
        console.log(`LEVEL UP! Yeni seviye: ${this.level}`);
        
        // Ekran sarsıntısı başlat (3. seviyeden itibaren)
        if (this.level >= 3) {
            // Seviye atladığında güçlü sarsıntı
            this.screenShakeIntensity = 4;
            this.screenShakeTime = 0.4;
            console.log('Level 3+ titreme aktif!');
        }
        
        // UI güncelle
        this.updateUI();
        
        // Seviye geçiş efekti
        this.flashScreen();
    }
    
    flashScreen() {
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.background = 'white';
        flash.style.opacity = '0.8';
        flash.style.pointerEvents = 'none';
        flash.style.zIndex = '999';
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.style.transition = 'opacity 0.5s';
            flash.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(flash);
            }, 500);
        }, 100);
    }
    
    showCombo() {
        const comboDisplay = document.getElementById('combo-display');
        const comboValue = document.getElementById('combo-value');
        
        comboValue.textContent = this.combo;
        comboDisplay.classList.remove('hidden');
        comboDisplay.style.opacity = '1';
        
        clearTimeout(this.comboTimeout);
        this.comboTimeout = setTimeout(() => {
            comboDisplay.style.opacity = '0';
            setTimeout(() => {
                comboDisplay.classList.add('hidden');
            }, 300);
        }, 1500);
    }
    
    updateStarfield(deltaTime) {
        const positions = this.starField.geometry.attributes.position.array;
        const speedFactor = this.isBoosting ? 5 : 1;
        
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            const i3 = i * 3;
            
            // Z ekseninde hareket
            positions[i3 + 2] += this.currentSpeed * speedFactor * star.speed * 60 * deltaTime;
            
            // Yıldız ekranı geçtiyse başa al
            if (positions[i3 + 2] > 50) {
                positions[i3 + 2] = star.originalZ;
            }
            
            // Warp efekti
            if (this.warpEffect > 0) {
                const stretch = 1 + this.warpEffect * 10;
                positions[i3 + 2] += stretch * deltaTime * 10;
            }
        }
        
        this.starField.geometry.attributes.position.needsUpdate = true;
    }
    
    updateBoost(deltaTime) {
        if (this.isBoosting && this.boostEnergy > 0) {
            // Enerji tüket (100 enerji 10 saniyede bitecek şekilde)
            this.boostEnergy = Math.max(this.boostEnergy - 0.167, 0);
            this.targetWarpEffect = 1;
            
            if (this.boostEnergy <= 0) {
                this.isBoosting = false;
            }
        } else {
            this.targetWarpEffect = 0;
            this.isBoosting = false;
        }
        
        // Warp efektini yumuşat
        this.warpEffect = THREE.MathUtils.lerp(this.warpEffect, this.targetWarpEffect, deltaTime * 5);
        
        // Boost UI güncelle
        const boostFill = document.getElementById('boost-fill');
        boostFill.style.width = `${this.boostEnergy}%`;
        
        // Boost aktifken renk değiştir
        if (this.isBoosting) {
            boostFill.style.background = 'linear-gradient(90deg, #ff00ff, #ff66ff)';
            boostFill.style.boxShadow = '0 0 30px rgba(255, 0, 255, 0.8)';
        } else {
            boostFill.style.background = 'linear-gradient(90deg, #00ffff, #ff00ff)';
            boostFill.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.8)';
        }
    }
    
    updateSpeedTimer(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        const now = Date.now();
        const gameTime = now - this.gameStartTime;
        const timeSinceLastIncrease = now - this.lastSpeedIncrease;
        
        // Her 30 saniyede bir hız artışı
        if (timeSinceLastIncrease >= 30000) {
            this.speedLevel++;
            this.baseSpeed = Math.min(this.baseSpeed * 1.2, 0.8);
            this.lastSpeedIncrease = now;
            
            // Hız artış efekti
            this.flashScreen();
            // Hız artışında da ekran sarsıntısı
            this.screenShakeIntensity = 3;
            this.screenShakeTime = 0.3;
        }
        
        // Speedometer güncelle
        const speedNeedle = document.getElementById('speed-needle');
        const speedArc = document.getElementById('speed-arc');
        const speedValue = document.getElementById('speed-value');
        const speedTimer = document.getElementById('speed-timer');
        
        // İbre açısı (0-180 derece)
        const maxSpeed = 12;
        const currentSpeedValue = this.speedLevel;
        const needleAngle = -90 + (currentSpeedValue / maxSpeed) * 180;
        
        if (speedNeedle) {
            speedNeedle.setAttribute('transform', `rotate(${needleAngle} 100 100)`);
        }
        
        // Hız arkını güncelle
        const progress = (currentSpeedValue / maxSpeed);
        const radius = 80;
        const startAngle = -90;
        const endAngle = startAngle + (progress * 180);
        
        // SVG ark path hesaplama
        const startX = 100 + radius * Math.cos((startAngle * Math.PI) / 180);
        const startY = 100 + radius * Math.sin((startAngle * Math.PI) / 180);
        const endX = 100 + radius * Math.cos((endAngle * Math.PI) / 180);
        const endY = 100 + radius * Math.sin((endAngle * Math.PI) / 180);
        
        const largeArcFlag = progress > 0.5 ? 1 : 0;
        const pathData = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
        
        if (speedArc) {
            speedArc.setAttribute('d', pathData);
        }
        
        // Hız değerini güncelle
        if (speedValue) {
            speedValue.textContent = currentSpeedValue.toFixed(1);
        }
        
        // Zamanlayıcı
        const remainingTime = Math.ceil((30000 - timeSinceLastIncrease) / 1000);
        if (speedTimer) {
            speedTimer.textContent = `${remainingTime}s`;
        }
    }
    
    updateUI() {
        // Skor güncelle
        const scoreElement = document.getElementById('score');
        if (scoreElement) scoreElement.textContent = this.score;
        
        // Seviye güncelle
        const levelElement = document.getElementById('level');
        if (levelElement) {
            levelElement.textContent = this.level;
            console.log(`UI Seviye güncellendi: ${this.level}`);
        }
        
        // Hayat görsellerini güncelle
        const lifeIcons = document.querySelectorAll('.life-icon');
        lifeIcons.forEach((icon, index) => {
            if (index < this.lives) {
                icon.classList.add('active');
            } else {
                icon.classList.remove('active');
            }
        });
        
        // Kalkan yüzdesini güncelle (hayata göre)
        const shieldPercent = document.getElementById('shield-percent');
        const shieldFill = document.getElementById('shield-fill');
        if (shieldPercent) {
            const percent = (this.lives / 4) * 100;
            shieldPercent.textContent = `${percent}%`;
            if (shieldFill) {
                shieldFill.style.opacity = percent / 100 * 0.3;
            }
        }
        
        // Yakıt göstergesini güncelle (boost'a göre)
        const fuelBars = document.querySelectorAll('.fuel-bar');
        const activeBars = Math.ceil((this.boostEnergy / 100) * 5);
        fuelBars.forEach((bar, index) => {
            if (index < activeBars) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
    }
    
    setupEventListeners() {
        // Mouse kontrolü
        document.addEventListener('mousemove', (e) => {
            if (this.gameState !== 'playing') return;
            
            this.mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            // Hedef pozisyonu hesapla (sınırlar içinde) - Y ekseni aralığını artıralım
            this.targetPos.x = THREE.MathUtils.clamp(this.mousePos.x * 15, -15, 15);
            this.targetPos.y = THREE.MathUtils.clamp(this.mousePos.y * 12, -12, 12);
        });
        
        // Klavye kontrolü
        document.addEventListener('keydown', (e) => {
            if (this.gameState !== 'playing') return;
            
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.boostEnergy > 0) {
                    this.isBoosting = true;
                }
            }
            
            if (e.code === 'Escape') {
                this.togglePause();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.isBoosting = false;
            }
        });
        
        // Buton olayları
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        document.getElementById('start-screen').classList.remove('active');
        document.body.classList.add('playing');
        
        // Oyun değişkenlerini sıfırla
        this.score = 0;
        this.level = 1;
        this.combo = 0;
        this.lives = 4;
        this.boostEnergy = 0;
        this.speedLevel = 1;
        this.baseSpeed = 0.15;
        this.currentSpeed = 0.15;
        this.gameStartTime = Date.now();
        this.lastSpeedIncrease = Date.now();
        
        // Uzay gemisini görünür yap
        if (this.spaceship) {
            this.spaceship.visible = true;
        }
        
        this.updateUI();
        
        // Spawn başlat
        this.spawnLoop();
    }
    
    spawnLoop() {
        if (this.gameState !== 'playing') return;
        
        // Kristal spawn - daha sık
        if (Math.random() < 0.03 + this.level * 0.008) {
            this.spawnCrystal();
        }
        
        // Asteroit spawn - çok daha fazla
        if (Math.random() < 0.06 + this.level * 0.015) {
            this.spawnAsteroid();
        }
        
        setTimeout(() => this.spawnLoop(), 100);
    }
    
    gameOver() {
        this.gameState = 'gameover';
        document.getElementById('game-over-screen').classList.add('active');
        document.body.classList.remove('playing');
        
        // Final skorları göster
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('final-level').textContent = this.level;
        document.getElementById('max-combo').textContent = this.maxCombo;
    }
    
    restartGame() {
        // Sahneyi temizle
        this.crystals.forEach(crystal => this.scene.remove(crystal));
        this.asteroids.forEach(asteroid => this.scene.remove(asteroid));
        this.particles.forEach(particle => this.scene.remove(particle));
        
        this.crystals = [];
        this.asteroids = [];
        this.particles = [];
        
        document.getElementById('game-over-screen').classList.remove('active');
        this.startGame();
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pause-screen').classList.add('active');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pause-screen').classList.remove('active');
        }
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.transition = 'opacity 0.5s';
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = 0.016; // ~60 FPS
        
        // Level 3'ten itibaren CANVAS'I SARSALIM - GERÇEK TİTREME
        if (this.gameState === 'playing' && this.level >= 3) {
            // Seviye ve hız arttıkça titreme şiddeti artıyor
            const baseIntensity = (this.level - 2) * 3; // Her seviye 3 piksel artış
            const speedBonus = this.speedLevel * 1.5; // Hız seviyesi başına 1.5 piksel
            const shakeIntensity = Math.min(baseIntensity + speedBonus, 20); // Maksimum 20 piksel
            
            // Canvas elementini sarsalım
            const canvas = this.renderer.domElement;
            const shakeX = (Math.random() - 0.5) * shakeIntensity;
            const shakeY = (Math.random() - 0.5) * shakeIntensity;
            
            canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
            
            // Çarpışma anında ekstra titreme
            if (this.screenShakeTime > 0) {
                this.screenShakeTime -= deltaTime;
                const extraShake = this.screenShakeIntensity * (this.screenShakeTime / 0.8);
                const extraX = (Math.random() - 0.5) * extraShake * 3;
                const extraY = (Math.random() - 0.5) * extraShake * 3;
                canvas.style.transform = `translate(${shakeX + extraX}px, ${shakeY + extraY}px)`;
            }
        } else {
            // Titreme yoksa canvas'i sıfırla
            const canvas = this.renderer.domElement;
            canvas.style.transform = 'translate(0, 0)';
        }
        
        if (this.gameState === 'playing') {
            // Hız hesaplama
            this.currentSpeed = this.baseSpeed * this.speedMultiplier * (this.isBoosting ? 3 : 1);
            
            // Uzay gemisi hareketi
            if (this.spaceship) {
                this.spaceship.position.x = THREE.MathUtils.lerp(
                    this.spaceship.position.x,
                    this.targetPos.x,
                    0.1
                );
                this.spaceship.position.y = THREE.MathUtils.lerp(
                    this.spaceship.position.y,
                    this.targetPos.y,
                    0.1
                );
                
                // Gemi eğimi - burun hep ortada, kıç hafif hareket ediyor
                // Y ekseni hareketi kıçı yukarı/aşağı eğiyor (azaltıldı)
                this.spaceship.rotation.x = -this.targetPos.y * 0.05;
                // X ekseni hareketi hafif yana eğim
                this.spaceship.rotation.z = -this.targetPos.x * 0.03;
                // Hafif yana yatış
                this.spaceship.rotation.y = -this.targetPos.x * 0.01;
                
                // Gemi ışığı pozisyonu
                if (this.shipLight) {
                    this.shipLight.position.copy(this.spaceship.position);
                    this.shipLight.position.z += 2;
                }
            }
            
            // Motor parçacıkları güncelle
            this.updateEngineParticles();
            
            // Kristalleri hareket ettir ve döndür
            this.crystals.forEach(crystal => {
                crystal.position.z += this.currentSpeed * 60 * deltaTime;
                crystal.rotation.x += crystal.userData.rotationSpeed.x;
                crystal.rotation.y += crystal.userData.rotationSpeed.y;
                crystal.rotation.z += crystal.userData.rotationSpeed.z;
                
                // Işıldama efekti
                crystal.userData.glowIntensity = Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
                crystal.traverse((child) => {
                    if (child.isMesh && child.material && child.material.emissiveIntensity !== undefined) {
                        child.material.emissiveIntensity = 0.2 + crystal.userData.glowIntensity * 0.3;
                    }
                });
                
                if (crystal.position.z > 25) {
                    this.scene.remove(crystal);
                }
            });
            
            // Asteroitleri hareket ettir ve döndür
            this.asteroids.forEach(asteroid => {
                asteroid.position.z += this.currentSpeed * 60 * deltaTime;
                asteroid.rotation.x += asteroid.userData.rotationSpeed.x;
                asteroid.rotation.y += asteroid.userData.rotationSpeed.y;
                asteroid.rotation.z += asteroid.userData.rotationSpeed.z;
                
                if (asteroid.position.z > 25) {
                    this.scene.remove(asteroid);
                }
            });
            
            // Temizlik - objeleri daha geç kaldır
            this.crystals = this.crystals.filter(c => c.position.z <= 25);
            this.asteroids = this.asteroids.filter(a => a.position.z <= 25);
            
            // Çarpışma kontrolü
            this.checkCollisions();
            
            // Dokunulmazlık kontrolü
            if (this.isInvulnerable) {
                const timeSinceHit = Date.now() - this.invulnerableTime;
                if (timeSinceHit > 2000) {
                    this.isInvulnerable = false;
                    // Dokunulmazlık bitince gemiyi kesinlikle görünür yap
                    if (this.spaceship) {
                        this.spaceship.visible = true;
                    }
                } else {
                    // Yanıp sönme efekti
                    if (this.spaceship) {
                        this.spaceship.visible = Math.floor(timeSinceHit / 100) % 2 === 0;
                    }
                }
            } else {
                // Dokunulmazlık yoksa gemi her zaman görünsün
                if (this.spaceship && this.gameState === 'playing') {
                    this.spaceship.visible = true;
                }
            }
            
            // Boost güncelle
            this.updateBoost(deltaTime);
            
            // Hız zamanlayıcısı güncelle
            this.updateSpeedTimer(deltaTime);
        }
        
        // Her zaman güncelle
        this.updateStarfield(deltaTime);
        this.updateParticles(deltaTime);
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

// Oyunu başlat
window.addEventListener('DOMContentLoaded', () => {
    const game = new CrystalCollector();
});