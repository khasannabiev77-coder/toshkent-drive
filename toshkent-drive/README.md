# Toshkent Drive

Toshkent ko'chalarida 3D haydash o'yini (brauzerda ishlaydi, Three.js).

- 59 ta mashina (10 tasi haqiqiy 3D model), 18 xil rang, 360° avtosalon va shaxsiy garaj
- Taksi rejimi, ko'chadagi pullar, cheksiz hisob
- Do'konlar, yo'laklarda yuruvchi odamlar, ko'cha harakati
- Telefon (gorizontal, sensorli boshqaruv) va kompyuter uchun alohida grafika: Telefon / Kompyuter / Ultra

## Ishga tushirish

GitHub Pages: **Settings → Pages → Branch: `main` / root → Save**. Bir necha daqiqadan so'ng o'yin
`https://<foydalanuvchi>.github.io/<repo-nomi>/` manzilida ochiladi.

Kompyuterda: papkada `npx serve` yoki `python -m http.server` ishga tushirib, brauzerda oching
(`index.html` ni to'g'ridan-to'g'ri ikki marta bosib ochsangiz 3D modellar yuklanmaydi).

## Boshqaruv

W/↑ gaz · S/↓ tormoz · A D/← → rul · Probel drift · T taksi · C kamera · H signal · R yo'lga qaytarish · B avtosalon · G garaj

## 3D modellar va litsenziyalar

Haqiqiy 3D modellar Sketchfab'dan olingan, hajmini kamaytirish uchun qayta siqilgan (teksturalar kichraytirilgan),
`models/` papkasida gzip+base64 ko'rinishida saqlanadi.

| Model | Muallif | Litsenziya |
|---|---|---|
| Ferrari 458 Italia | vicent091036 | CC BY 4.0 |
| [pagani zonda cinque](https://sketchfab.com/3d-models/pagani-zonda-cinque-43717d017acd4ac0b60f95e50d81ef9d) | amogusstrikesback2 | CC BY 4.0 |
| [2022 Arash Imperium](https://sketchfab.com/3d-models/2022-arash-imperium-697e5455b4d6488c9bdd5a1b49b755b1) | 007 | CC BY 4.0 |
| [honda indycar 2015](https://sketchfab.com/3d-models/honda-indycar-2015-e2ca214bc5e943cb8277807f68acb5ad) | Dave Love | CC BY 4.0 |
| [2024 Porsche 992 GT3 R](https://sketchfab.com/3d-models/2024-porsche-992-gt3-r-b76c9b2ae2d548c3869426eac4ab8a19) | Dave Love | CC BY 4.0 |
| [Mercedes-Benz AMG E63 Brabus 800](https://sketchfab.com/3d-models/mercedes-benz-amg-e63-brabus-800-2a4c3dc0b3d74bfe946be1e1f9174b64) | VTDAT23 | CC BY 4.0 |
| [BMW M340i Modified](https://sketchfab.com/3d-models/bmw-m340i-modified-d2ab9d4eb0f540699ee404112dc822f5) | VTDAT23 | CC BY 4.0 |
| [BMW M4 Red Eyes](https://sketchfab.com/3d-models/bmw-m4-red-eyes-d736f41b4123453bae4df68b7b349087) | VTDAT23 | CC BY 4.0 |
| [Porsche 911 GT3 RS Weissach](https://sketchfab.com/3d-models/porsche-911-gt3-rs-weissach-549c25c48c474274be5373f1f2fe20a8) | VTDAT23 | CC BY 4.0 |
| [LB-Works Ferrari F40](https://sketchfab.com/3d-models/lb-works-ferrari-f40-wwwvecarzcom-011cad3526e945799d6e98dde6390182) | vecarz (www.vecarz.com) | CC BY-NC-SA 4.0 — faqat notijorat |

CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ · CC BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/

Ferrari F40 modeli notijorat litsenziyada: o'yinni pullik qilsangiz, uni olib tashlang.
Mashina brendlari nomlari tegishli kompaniyalarning savdo belgilari; o'yin ular bilan bog'liq emas.
Draco dekoder (`draco/`) — Google Draco, Apache 2.0.
## Papka tuzilishi

```
toshkent-drive/
├── index.html              o'yinning o'zi (HTML + CSS + JavaScript, Three.js r128)
├── models/                 siqilgan haqiqiy 3D modellar (gzip + base64, .txt qismlar) va ferrari.json
├── models-original/        asl Ferrari 458 Italia modeli (.glb, Draco)
├── draco/                  Draco dekoder (ferrari.json uchun)
├── tools/
│   ├── GltfSlim.cs         Sketchfab .glb/.gltf modellarni o'yin uchun siquvchi (C#, .NET Framework)
│   ├── inspect-glb.ps1     .glb fayl muallifi, litsenziyasi va hajmini ko'rsatadi
│   └── artifact-version.html  claude.ai artifact versiyasi (doctype'siz)
└── README.md
```

### Yangi 3D mashina qo'shish

1. Sketchfab'dan glTF/GLB formatdagi CC BY modelni yuklab oling.
2. `tools/inspect-glb.ps1 -Files model.glb` — litsenziya va material nomlarini tekshiring.
3. PowerShell'da siqing:
   ```powershell
   Add-Type -Path tools\GltfSlim.cs -ReferencedAssemblies System.Drawing,System.Web.Extensions
   [GltfSlim]::Run("C:\yo'l\model.glb", "models\kalit", 1024)
   ```
4. `index.html` dagi `RAW` ro'yxatiga mashinani, `REAL` ro'yxatiga `{key:'kalit', n:<qismlar soni>, paint:/bo'yoq material nomi/, credit:'...'}` qo'shing.