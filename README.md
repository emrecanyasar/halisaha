# Halısaha ⚽

Halısaha ekibimiz için Sofascore / Flashscore tarzı maç ve oyuncu takip uygulaması.
Şu an **deneme sürümü**: veriler tarayıcıda (localStorage) tutuluyor, giriş/kayıt da bu cihazda çalışıyor.

Deneme hesabı: `can@halisaha.app` / `123456`

## Özellikler

- **Maçlar:** Yaklaşan / biten maç listesi, gün-saat-saha belirleme, takım adı ve rengi
- **Kadro:** 5v5'ten 11v11'e kişi sayısı seçimi, dizilişler, saha üzerinde dokunarak oyuncu yerleştirme, yer değiştirme
- **Dengeli takım kur:** Gelecek oyuncuları seç, özellik puanlarına göre iki takıma adil dağıtılsın
- **Skor:** Gol, golcü ve asist girişi
- **Kapalı oylama:** Maç bitince oynayan herkes diğerlerine 1–10 puan ve isteğe bağlı özellik puanı verir. Kimin kime ne verdiği asla gösterilmez. Herkes oy verince ya da oylama kapatılınca ratingler açılır.
- **Maç ratingleri:** Sofascore renk skalası, maçın oyuncusu (MVP), saha üzerinde rating rozetleri
- **Oyuncu profili:** Radar grafiği (Hücum, Teknik, Pas, Savunma, Fizik), genel puan, ortalama rating, son maçlar form grafiği, G/B/M, gol, asist, MVP
- **Özellikler oylamadan hesaplanır:** Son maçlar daha ağır basar (yarı ömür 5 maç)
- **Hesaplar:** Giriş, kayıt (ekipteki mevcut profili sahiplenme dahil), şifremi unuttum ekranı, hesabım (ad, e-posta, şifre değiştirme, çıkış). E-posta onayı yok.
- **Tasarım:** Açık (beyaz) tema; mobilde alt menü, masaüstünde sol kenar çubuğu ve iki sütunlu sayfalar
- **Yedekleme:** JSON olarak dışa / içe aktarma

> ⚠️ Şifreler şimdilik tarayıcıda SHA-256 özetiyle saklanıyor. Bu gerçek bir güvenlik sağlamaz; ortak sunucuya (Supabase Auth vb.) geçince yerini sunucu tarafı kimlik doğrulama alacak.

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
  pages/auth/            Giriş, kayıt, şifremi unuttum
  lib/auth.ts            Şifre özeti, e-posta doğrulama, şifre gücü
```

## Yol haritası

- [ ] Backend (Supabase önerilir): ortak veri, herkes kendi telefonundan oy versin
- [x] Giriş / kayıt / şifremi unuttum sayfaları (arayüz + yerel çalışma)
- [ ] Gerçek kimlik doğrulama (Supabase Auth), Google ile giriş, şifre sıfırlama e-postası
- [ ] Maç davet / katılım (geliyorum / gelmiyorum)
- [ ] Bildirimler (oy verme hatırlatması)
- [ ] Mobil uygulama (React Native / Expo, ya da PWA ile başlangıç)

Veri katmanı `StoreContext.tsx` içinde toplandığı için backend'e geçişte sayfalar değişmeden kalabilir.
