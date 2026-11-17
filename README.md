# Halısaha ⚽

Halısaha ekibimiz için Sofascore / Flashscore tarzı maç ve oyuncu takip uygulaması.
Şu an **deneme sürümü**: giriş sistemi yok, veriler tarayıcıda (localStorage) tutuluyor.

## Özellikler

- **Maçlar:** Yaklaşan / biten maç listesi, gün-saat-saha belirleme, takım adı ve rengi
- **Kadro:** 5v5'ten 11v11'e kişi sayısı seçimi, dizilişler, saha üzerinde dokunarak oyuncu yerleştirme, yer değiştirme
- **Dengeli takım kur:** Gelecek oyuncuları seç, özellik puanlarına göre iki takıma adil dağıtılsın
- **Skor:** Gol, golcü ve asist girişi
- **Kapalı oylama:** Maç bitince oynayan herkes diğerlerine 1–10 puan ve isteğe bağlı özellik puanı verir. Kimin kime ne verdiği asla gösterilmez. Herkes oy verince ya da oylama kapatılınca ratingler açılır.
- **Maç ratingleri:** Sofascore renk skalası, maçın oyuncusu (MVP), saha üzerinde rating rozetleri
- **Oyuncu profili:** Radar grafiği (Hücum, Teknik, Pas, Savunma, Fizik), genel puan, ortalama rating, son maçlar form grafiği, G/B/M, gol, asist, MVP
- **Özellikler oylamadan hesaplanır:** Son maçlar daha ağır basar (yarı ömür 5 maç)
- **Yedekleme:** JSON olarak dışa / içe aktarma

## Kurulum

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ klasörüne üretim derlemesi
npm run build:preview  # dist-single/index.html — tek dosyalık önizleme
```

## Teknoloji

React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router

## Proje yapısı

```
src/
  types.ts               Veri modeli (Player, Match, Vote...)
  store/StoreContext.tsx Veri katmanı (şimdilik localStorage)
  lib/stats.ts           Rating, özellik, istatistik, dengeli takım hesapları
  lib/seed.ts            Örnek veri
  lib/constants.ts       Dizilişler, etiketler, renkler
  components/            Saha, grafikler, ortak UI
  pages/                 Ekranlar
```

## Yol haritası

- [ ] Backend (Supabase önerilir): ortak veri, herkes kendi telefonundan oy versin
- [ ] Kullanıcı girişi (telefon / Google), "Ben kimim" seçiminin kalkması
- [ ] Maç davet / katılım (geliyorum / gelmiyorum)
- [ ] Bildirimler (oy verme hatırlatması)
- [ ] Mobil uygulama (React Native / Expo, ya da PWA ile başlangıç)

Veri katmanı `StoreContext.tsx` içinde toplandığı için backend'e geçişte sayfalar değişmeden kalabilir.
