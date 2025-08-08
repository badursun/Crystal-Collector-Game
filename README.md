# Crystal Collector - Space Adventure

🚀 **3D Uzay Macera Oyunu** - Kristalleri topla, asteroitlerden kaç, skoru arttır!

## 🎮 Oyun Hakkında

Crystal Collector, Three.js kullanılarak geliştirilmiş 3D bir uzay macera oyunudur. Uzay geminizi kontrol ederek değerli kristalleri toplayın, tehlikeli asteroitlerden kaçının ve en yüksek skoru elde etmeye çalışın.

## ✨ Özellikler

- **3D Grafik**: Three.js ile geliştirilmiş etkileyici 3D görsel efektler
- **Fizik Sistemi**: Gerçekçi hareket ve çarpışma dinamikleri  
- **Dinamik Zorluk**: Her seviyede artan hız ve zorluk
- **Combo Sistemi**: Ardışık kristal toplama ile bonus puanlar
- **Parçacık Efektleri**: Görsel zenginlik için özel efektler
- **Responsive Tasarım**: Farklı ekran boyutlarına uyumlu
- **Cockpit UI**: Uzay temalı kullanıcı arayüzü

## 🎯 Nasıl Oynanır

- **🖱️ Fare**: Uzay geminizi hareket ettirin
- **⌨️ SPACE**: Turbo hız için basılı tutun
- **⌨️ ESC**: Oyunu duraklat
- **💎 Hedef**: Kristalleri toplayın, asteroitlerden kaçın
- **⚡ Combo**: Hızlı kristal toplama ile bonus puanlar kazanın

## 🛠️ Teknolojiler

- **Three.js** - 3D grafik kütüphanesi
- **WebGL** - Donanım hızlandırmalı grafik
- **HTML5** - Modern web standartları
- **CSS3** - Gelişmiş stil ve animasyonlar
- **JavaScript ES6+** - Modern JavaScript özellikleri

## 🚀 Kurulum

1. Projeyi klonlayın:
```bash
git clone https://github.com/badursun/Crystal-Collector-Game.git
```

2. Proje dizinine girin:
```bash
cd Crystal-Collector-Game
```

3. Bir web sunucusu ile çalıştırın:
```bash
# Python kullanarak
python -m http.server 8000

# Node.js kullanarak  
npx serve .

# Live Server extension ile VS Code'da
```

4. Tarayıcınızda `http://localhost:8000` adresine gidin

## 📁 Proje Yapısı

```
Crystal-Collector-Game/
├── index.html          # Ana HTML dosyası
├── game.js             # Oyun mantığı ve Three.js kodu
├── style.css           # Stil dosyası
├── models/             # 3D model dosyaları
│   ├── spaceship.glb
│   ├── crystal_pack_stylized.glb
│   └── asteroids_pack.glb
└── README.md           # Bu dosya
```

## 🎨 Oyun Mechanics

- **Skor Sistemi**: Her kristal için puan kazanın
- **Seviye Sistemi**: Otomatik seviye geçişleri
- **Hız Kontrolü**: SPACE tuşu ile turbo mod
- **Can Sistemi**: 4 can ile başlayın
- **Kalkan Sistemi**: Geçici koruma
- **Radar**: Çevredeki nesneleri takip edin

## 🌟 Gelecek Güncellemeler

- [ ] Daha fazla 3D model çeşitliliği
- [ ] Ses efektleri ve background müzik
- [ ] Power-up sistemleri
- [ ] Leaderboard (skor tablosu)
- [ ] Mobil optimizasyonları

## 🤝 Katkıda Bulunma

1. Bu projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'inizi push edin (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje MIT lisansı altında yayınlanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakın.

## 👨‍💻 Geliştirici

**Badursun** - [@badursun](https://github.com/badursun)

---

⭐ Bu projeyi beğendiyseniz star vermeyi unutmayın!
