# Toshkent Drive

Toshkent ko'chalarida 3D haydash o'yini (brauzerda ishlaydi, Three.js).

- 59 ta haqiqiy 3D mashina modeli (Sketchfab mualliflari ishlari), 18 xil rang, 360° avtosalon va shaxsiy garaj
- 3D shahar: tomli mahalla uylari va devorlari, balkonli koʻp qavatli uylar, minorali osmonoʻpar binolar, ishlaydigan svetoforlar, bekatlar, skameykalar, favvoralar, teraklar va bulutlar
- Ovoz: silindrlar soniga qarab farqlanuvchi motor (3 silindrdan V12 gacha), drift va tormozda shina chiyillashi, yoʻl va shamol shovqini, elektromobil ovozi
- Taksi rejimi (tomda TAXI belgisi), ko'chadagi pullar, cheksiz hisob
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
| [audi a4 L40 tfsi](https://sketchfab.com/3d-models/none-2643e170ef3749e0ad25d6b72287f4fa) | ItsDiyor | CC BY 4.0 |
| [Audi A6 55 TFSI Quattro (C8)](https://sketchfab.com/3d-models/none-04925f2cea0c4090a58d13d88e3f16d9) | Mona x Supercars | CC BY 4.0 |
| [2015 Audi Q7](https://sketchfab.com/3d-models/none-d4a18a7aa15f4a34a2cb159e593d948f) | DisneyCars | CC BY 4.0 |
| [2023 Audi RS Q8](https://sketchfab.com/3d-models/none-c30b4a6ec479473a814d030da10e97a8) | DisneyCars | CC BY 4.0 |
| [2021 Audi R8 V10 Performance Quattro (Type 4S)](https://sketchfab.com/3d-models/none-8dd1c237238244d1a2a49d764d321b87) | DisneyCars | CC BY 4.0 |
| [2020 Audi RS 6 Avant](https://sketchfab.com/3d-models/none-dd3fa0ca27ae4b73b89cac131f8d5bac) | Galaxy Car Showroom | CC BY 4.0 |
| [2006 BMW 330i](https://sketchfab.com/3d-models/none-e0b76d9753fc4f458248c96c79021fdb) | tonielpro520 | CC BY 4.0 |
| [Bmw M5 F90](https://sketchfab.com/3d-models/none-5478e978bd634337adc8e3dc413fbfa3) | Res1n | CC BY 4.0 |
| [BMW 7-series (F01)](https://sketchfab.com/3d-models/none-0806c39847ae42e5996917f50527dda0) | Black Snow | CC BY 4.0 |
| [BMW i8 XS 2015 / www.vecarz.com](https://sketchfab.com/3d-models/none-b7108d20560c43e2b0a2d1473b311cfb) | vecarz | CC BY 4.0 |
| [BMW M4 f82](https://sketchfab.com/3d-models/none-8e87379f40fd40dcac0a751e22c1a188) | Black Snow | CC BY 4.0 |
| [BMW M8 F92 Coupé Competition](https://sketchfab.com/3d-models/none-25d5b4f6d13e4217afa09bbf89f8d993) | kevin (ケビン) | CC BY 4.0 |
| [2020 BMW X5 M Competition](https://sketchfab.com/3d-models/none-9b211d525797457e988c903f67d0b753) | David_Holiday | CC BY 4.0 |
| [2023 BMW X7 M60i LCI](https://sketchfab.com/3d-models/none-c0ad7e054f1149c59356be6ef1d6e765) | tonielpro520 | CC BY 4.0 |
| [2017 Chevy Camaro 50th Anniversary](https://sketchfab.com/3d-models/none-3561f21d49cd45a18cfee52611f843a4) | Ddiaz Design | CC BY 4.0 |
| [Chevrolet Cobalt LTZ 2014](https://sketchfab.com/3d-models/chevrolet-cobalt-ltz-2014-f91cbef731444f939e263041400216ca) | Q.SARDOR | CC BY 4.0 |
| [2019 Chevrolet Corvette C8 Stingray](https://sketchfab.com/3d-models/none-790c40ccff6843eab0b7b4bd18421ff8) | Hari Prasath R | CC BY 4.0 |
| [Chevrolet Damas](https://sketchfab.com/3d-models/none-70f8556e4b3840e7b975f0e000b54757) | own.guest | CC BY 4.0 |
| [2018 Chevrolet Equinox Premier](https://sketchfab.com/3d-models/none-f71a75f282fb4f77a2f8c0b615326c40) | 007 | CC BY 4.0 |
| [Midnight Black Chevrolet Gentra in a Showroom](https://sketchfab.com/3d-models/none-c2ada660984b4bcd998b28121496989a) | Aizen_Uchixa | CC BY 4.0 |
| [Chevrolet Malibu 2021](https://sketchfab.com/3d-models/none-cd2db315d2284c7e9cf1bc07dde42eb1) | ItsDiyor | CC BY 4.0 |
| [2009_Chevrolet_Aveo](https://sketchfab.com/3d-models/2009-chevrolet-aveo-0b2cf39c664043ccbdb5fa0261ae5644) | creativelion | CC BY 4.0 |
| [Onix+ Plus+2021](https://sketchfab.com/3d-models/onix-plus2021-80bd5cbd59fb4c1a876c78cb63f003d9) | lilbronie | CC BY 4.0 |
| [Chevrolet Spark](https://sketchfab.com/3d-models/none-70342145bcad4441be1827322a8c8879) | BHP3D | CC BY 4.0 |
| [2021 Chevrolet Tahoe RST-Police](https://sketchfab.com/3d-models/none-c18bbb58fafa41f18b168f3a2d980850) | David_Holiday | CC BY 4.0 |
| [Chevrolet Trax 2021](https://sketchfab.com/3d-models/none-76e12f46be1743c591ac01544fb97399) | ItsDiyor | CC BY 4.0 |
| [2020 Ferrari Roma](https://sketchfab.com/3d-models/none-cbc0c13c0fb54fc8bbfa79a9ff99e3aa) | Ddiaz Design | CC BY 4.0 |
| [Ferrari sf90](https://sketchfab.com/3d-models/none-91dac0d8576c4c69a7a74ad585732b43) | Res1n | CC BY 4.0 |
| [2019 Lamborghini Aventador SVJ 63](https://sketchfab.com/3d-models/none-89258ec08a6c4e9dbc4194cf71c0aa08) | Ddiaz Design | CC BY 4.0 |
| [2019 Lamborghini Huracán EVO Spyder](https://sketchfab.com/3d-models/none-12956518b5084ee693c028d49d3eed0e) | Ddiaz Design | CC BY 4.0 |
| [2025 Lamborghini Urus SE](https://sketchfab.com/3d-models/none-cc113385b7e34481af5e50a2fb8b6b2e) | Ddiaz Design | CC BY 4.0 |
| [2021 Mercedes-AMG GT Black Series](https://sketchfab.com/3d-models/none-5b62f77d732041a68784d13026ce7a16) | DisneyCars | CC BY 4.0 |
| [Mercedes-Benz C-Class 2020](https://sketchfab.com/3d-models/none-19d59344b7554e6ab614a6cc02e7ad0a) | ItsDiyor | CC BY 4.0 |
| [Mercedes-AMG E 63 S (W213)](https://sketchfab.com/3d-models/none-f61d8efb0b9b4c499fc66fcf35a4d09c) | Mona x Supercars | CC BY 4.0 |
| [2020 Mercedes-Benz G-Class AMG G63](https://sketchfab.com/3d-models/none-52296f1a65d54a85a2ed7cb67604e554) | Outlaw Games™ | CC BY-NC 4.0 — faqat notijorat |
| [2016 Mercedes-Benz GLE63 AMG Coupe](https://sketchfab.com/3d-models/none-b1dffb8bf69047598ab7c5727d7c2770) | Ddiaz Design | CC BY-NC-SA 4.0 — faqat notijorat |
| [Mercedes S-class](https://sketchfab.com/3d-models/none-8095e37cc664438d9e0995481280da97) | SipanBareyan | CC BY 4.0 |
| [2019 Porsche 911 Carrera S Cabriolet (992)](https://sketchfab.com/3d-models/none-7d3b9ae0f8014d58a9e8547b5c29aef9) | Ddiaz Design | CC BY 4.0 |
| [2022 Porsche Cayenne Turbo GT](https://sketchfab.com/3d-models/none-3f3fa4493ecc4826823f0cb27f638908) | Maroi Mister Let Me Think Official 3D Studio | CC BY 4.0 |
| [Tesla Cybertruck](https://sketchfab.com/3d-models/none-1ab0c3f248fa47019c4311abce9731a0) | A Certain Duck | CC BY 4.0 |
| [Tesla Model 3 2020](https://sketchfab.com/3d-models/none-596bbf266fce430181e6d0e2b1903364) | ItsDiyor | CC BY 4.0 |
| [tesla model s](https://sketchfab.com/3d-models/none-40de2b7bb85849eb998b7529d7cb29d9) | amogusstrikesback2 | CC BY 4.0 |
| [Tesla Model X 2020](https://sketchfab.com/3d-models/none-c61839793eab4f31a26e261a2de750b5) | ItsDiyor | CC BY 4.0 |
| [2021 Tesla Model Y](https://sketchfab.com/3d-models/none-59e2ead369984b1a85c800ff6cf6789d) | tonielpro520 | CC BY 4.0 |
| [2022_ Toyota_ Land_ Cruiser_300_VX](https://sketchfab.com/3d-models/2022--toyota--land--cruiser-300-vx-1b085c709c304ace8017a9bb0c26ad48) | rexrain studio | CC BY 4.0 |
| [Volvo S90](https://sketchfab.com/3d-models/none-5c178cf6696a4a02a0f550db7934d127) | シRuletăシ | CC BY 4.0 |
| [Volvo V60 Polestar (2013)](https://sketchfab.com/3d-models/none-504ce39150fe49c7979f702d5f0f8580) | Myedsu | CC BY 4.0 |
| [2023 Volvo XC60](https://sketchfab.com/3d-models/none-986e54be12664ff59d0748d003883ace) | tonielpro520 | CC BY 4.0 |
| [Volvo-XC90-CCD-assembly](https://sketchfab.com/3d-models/none-215241839e264612b36d13974aca8774) | jday.amx | CC BY 4.0 |

CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ · CC BY-NC-SA 4.0: https://creativecommons.org/licenses/by-nc-sa/4.0/

Ferrari F40, Mercedes-Benz G 63 AMG va Mercedes-Benz GLE modellari notijorat (NC) litsenziyada: o'yinni pullik qilsangiz, ularni olib tashlang yoki almashtiring.
Ko'chadagi boshqa mashinalar (transport oqimi) tezlik uchun soddalashtirilgan protsedura modellarida qolgan.
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