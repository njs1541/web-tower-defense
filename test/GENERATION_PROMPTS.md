# SD 캐릭터 파츠 생성 프롬프트 명세서 (1차 리아나 & 인간족 바디)

이 문서는 [test/ASSET_SPEC.md](test/ASSET_SPEC.md)의 파츠 분할 사양과 기존 비주얼 가이드(`visual_style_guide.html`)의 종족별·캐릭터별 프롬프트 규칙을 결합하여, **나노바나나 및 이미지 생성 AI(Gemini, Midjourney, SD 등)**에 바로 입력할 수 있도록 작성한 프롬프트 가이드입니다.

---

## 📌 0. 핵심 생성 규칙 (사양 요약)

1. **캔버스 & 해상도**: 1024×1024 PNG 고정
2. **배경색**: 단색 크로마키 녹색 `#00FF00` (파츠에 녹색이 포함된 경우에만 `#FF00FF` 마젠타 사용)
3. **비율 및 포즈**:
   - 2.5등신 SD (머리 높이 약 280px, 전체 키 약 700px)
   - 머리 꼭대기: `y ≈ 180`, 발바닥: `y ≈ 880`, 중심선: `x ≈ 512`
   - 화면 오른쪽을 바라보는 3/4 측면
   - 차렷 자세에서 양팔을 살짝 벌리고 팔꿈치를 가볍게 굽힘, 다리도 어깨너비로 벌려 부위 간 겹침 방지
4. **절대 금지 요소 (Negative)**:
   - 텍스트, 워터마크, 라벨, 격자 테두리, 바닥 그림자, 후광(Bloom/Glow), 배경 효과, 잘림(Cut-off)
   - 아동/로리 체형 배제 (2.5등신이어도 성인 여성 비율 및 단정한 바디슈트 유지)

---

## 🎨 1. 공통 프롬프트 모듈

### [모듈 A] 공통 스타일 & 규격 (Positive Base)
```text
masterpiece, best quality, ultra-detailed 2D anime game character asset, bold clean outlines, crisp cell shading, high contrast, flat single solid chroma key background, green background (#00FF00), no shadows on ground, completely isolated on flat green screen, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose facing slightly right in 3/4 perspective, 2.5 heads tall chibi SD proportion, adult female proportion compressed into 2.5 heads tall chibi scale, neutral calm standing pose with arms and legs slightly spaced apart
```

### [모듈 B] 공통 필수 네거티브 (Negative Base)
```text
low quality, worst quality, blurry, fuzzy edges, rough sketch, painterly, soft shading, photorealistic, 3D render, ground shadow, drop shadow, floor shadow, cast shadow, halo, glow, bloom, backlight, light leak, atmospheric haze, background pattern, gradient background, border, frame, margin, grid, text, watermark, signature, artist name, label, cut off, cropped, out of frame, cut off head, cut off feet, close-up, bust shot, child, kid, underage, loli, boy, male, masculine, deformed limbs, extra limbs, missing limbs, fused fingers, bad anatomy
```

---

## 🧍‍♀️ [단계 1] 인간족 기준 바디 (`body_human/b00_master.png`)

> **목적**: 종족 내 모든 캐릭터가 공유하는 '종족 공통 순수 소체' 마스터 이미지입니다.
> **핵심 원칙**: 기괴한 목각/플라스틱 마네킹이 아니라, **미소녀 애니메이션 화풍의 매끄러운 살색 소체(부드러운 달걀형 민머리 + 자연스러운 피부톤의 2.5등신 미소녀 체형)**로 출력합니다.

### [방법 1] 순수 텍스트 생성 (Text-to-Image)

#### Positive Prompt:
```text
masterpiece, best quality, ultra-detailed 2D anime game art, crisp clean anime lineart, vibrant smooth cel-shading, Genshin and Blue Archive style, flat single solid chroma key background, green background (#00FF00), completely isolated, no floor shadows,
human race anatomical base avatar, cute 2.5 heads tall chibi anime girl proportion, adult female anime body compressed into 2.5 heads chibi scale,
smooth cute egg-shaped anime head, completely bald, smooth hairless head with cute anime head contour and neat jawline, NO facial features, completely blank smooth porcelain skin-toned face, NO eyes, NO nose, NO mouth, NO eyebrows, smooth anime ears on sides of head,
pure seamless skin-toned anime body silhouette, wearing an ultra-thin seamless skin-colored form-fitting bodysuit matching natural skin tone perfectly, smooth clean skin surface, modest non-sexual proportions, slender neck, compact feminine torso, natural cute chibi limbs, bare hands, bare feet,
straight upright standing pose facing slightly right (3/4 perspective), arms held slightly outward away from the torso with elbows slightly bent, legs spaced naturally shoulder-width apart without crossing,
perfectly centered on 1024x1024 canvas, head top at y=180, feet at y=880, center axis at x=512
```

#### Negative Prompt:
```text
wooden, wooden mannequin, ball-jointed doll, doll joints, robotic joints, mechanical, cyborg, metallic, plastic doll, creepy, uncanny valley, alien, faceless monster, horror, rough texture, 3D render, photorealistic, hair, long hair, short hair, wig, facial features, eyes, pupils, mouth, nose, lips, clothes, fabric folds, heavy armor, underwear, lingerie, bra, panties, dark bodysuit, black suit, shoes, boots, ground shadow, background gradient, glow, bloom, text, watermark, signature, cropped, extra limbs, bad anatomy
```

---

### [방법 2] 원화 참조 변환 (Image-to-Image / 나노바나나 등 이미지 첨부 시)

> `assets/char_liana.jpg`를 [Image 1]로 첨부하여 화풍과 선화 퀄리티를 유지하면서 민머리 소체로 디폼 변환하는 프롬프트입니다.

#### Prompt:
```text
Based on attached Image 1:
Faithfully keep the anime art style, clean lineart, and smooth cel-shading quality of Image 1, but DEFORM and CONVERT her into an official 2.5 heads tall chibi SD blank anatomical base body model:
- Proportions: 2.5 heads tall chibi anime girl proportion, perfectly centered on 1024x1024 canvas, standing in 3/4 perspective facing slightly right, head top at y=180, feet at y=880.
- Head & Face: Hairless smooth cute egg-shaped anime head, completely bald, neat anime chin contour, smooth featureless skin-toned face with NO eyes, NO nose, NO mouth, NO eyebrows (pure smooth blank porcelain skin, cute anime ears).
- Body & Attire: Pure seamless skin-toned anime silhouette. Strip ALL armor, tunic, boots, belts, weapons, and clothing. Wearing only an ultra-thin seamless skin-toned layer matching her skin tone. Bare hands and bare feet. Arms slightly spaced with elbows bent, legs spaced shoulder-width apart.
- Background: Flat single solid chroma key green background (#00FF00), completely isolated, no floor shadows.
Avoid: wooden, wooden mannequin, ball-jointed doll, doll joints, mechanical, plastic doll, creepy, alien, 3D render, hair, eyes, nose, mouth, clothes, armor, boots, dark bodysuit, text, watermark, cropped.
```

---

## 🧩 [단계 2] 바디 파츠 9종 (`body_human/b01` ~ `b09`)

> **권장 작업 방식**: `b00_master.png`를 기준으로, **해당 부위만 남기고 나머지를 `#00FF00`으로 마스킹/제거**하며 관절 회전 여백(30~40px)을 채웁니다. (위치를 절대 옮기지 마세요!)

| 파일명 | 부위 | 이미지 편집/Inpainting 프롬프트 지시문 |
|---|---|---|
| `b01_head_base.png` | 머리 | `Cleanly extract ONLY the head and upper neck from the reference image b00. Keep exact same canvas coordinate (x=512, y=180-460). Blank faceless head, no hair, no eyes. Fill neck joint smoothly down by 35px. Everything else is pure solid green (#00FF00).` |
| `b02_torso_upper.png` | 상체 | `Extract ONLY the upper torso from neck base down to waist and shoulder joints. Keep identical position. Extend neck base up by 30px and shoulder joints outward by 35px with rounded contour for pivot overlap. Remove head, arms, pelvis, and legs into solid green.` |
| `b03_pelvis.png` | 골반 | `Extract ONLY the pelvis/hips from waist down to hip socket joints. Keep identical position. Extend upper waist line up by 30px inside torso overlap, and round hip sockets by 35px. Remove all other parts into solid green.` |
| `b04_arm_near_upper.png` | 가까운 팔 위 | `Extract ONLY the viewer-near upper arm (right arm, shoulder to elbow). Keep exact position. Extend shoulder ball up-inwards by 35px and elbow down-inwards by 35px with clean rounded circular joints. Pure green background.` |
| `b05_arm_near_lower.png` | 가까운 팔 아래 | `Extract ONLY the viewer-near forearm and hand (elbow to fingertips). Keep exact position. Extend elbow joint up-inwards by 35px with smooth rounded cap. Pure green background.` |
| `b06_arm_far_upper.png` | 먼 팔 위 | `Extract ONLY the viewer-far upper arm (left arm in 3/4 view, shoulder to elbow). Keep exact position. Extend shoulder and elbow joints by 35px rounded overlap. Pure green background.` |
| `b07_arm_far_lower.png` | 먼 팔 아래 | `Extract ONLY the viewer-far forearm and hand (elbow to fingertips). Keep exact position. Extend elbow joint up-inwards by 35px rounded overlap. Pure green background.` |
| `b08_leg_near.png` | 가까운 다리 | `Extract ONLY the viewer-near leg (right leg from hip joint down to boot/foot tip). Keep exact position. Extend hip socket joint upwards by 35px rounded overlap. Pure green background.` |
| `b09_leg_far.png` | 먼 다리 | `Extract ONLY the viewer-far leg (left leg from hip joint down to boot/foot tip). Keep exact position. Extend hip socket joint upwards by 35px rounded overlap. Pure green background.` |

---

## ⚔️ [단계 3] 리아나 완성본 (`char_liana/c00_complete.png`)

> **목적**: `b00_master.png`와 정확히 동일한 캔버스 위치/포즈/비율로 원화(`assets/char_liana.jpg`)의 리아나 의상과 장비를 장착한 전신 완성본.
> **첨부 참조**: `b00_master.png` (포즈/체형 기준) + `assets/char_liana.jpg` (디자인 기준)

### Positive Prompt:
```text
masterpiece, best quality, ultra-detailed 2D anime game character art, bold clean outlines, crisp cell shading, flat single solid chroma key green background (#00FF00), completely isolated, no floor shadows,
faithful 2.5 heads chibi SD adaptation of the character Liana from reference image:
young adult female rookie knight, 2.5 heads tall chibi proportion, identical pose, scale and coordinates to b00 mannequin base,
short neat brown bob hairstyle, expressive clear brown anime eyes, gentle determined expression,
silver steel breastplate chest armor with brown leather shoulder straps, white tunic cloth shirt underneath with sleeves rolled up to elbows showing bare forearms, brown leather waist belt with iron buckle, dark navy trousers pants, sturdy brown leather combat boots,
holding a polished steel longsword in near hand (right hand), holding a wooden kite shield with winged helmet crest insignia on far arm (left arm),
facing slightly right in 3/4 standing pose, arms slightly spaced, legs shoulder-width apart,
head top at y=180, feet planted at y=880, center axis at x=512, perfectly aligned with b00
```

### Negative Prompt:
```text
low quality, blurry, photorealistic, 3D, ground shadow, drop shadow, glowing aura, light effects, gradient background, cropped, cut off boots, child, loli, boy, male, wings, cape, halo, extra limbs, wrong weapon
```

---

## 🛡️ [단계 4] 리아나 파츠 14종 (`char_liana/c01` ~ `c14`)

> **권장 작업 방식**: `c00_complete.png`를 기반으로, **해당 의상/파츠만 남기고 인체 살점 및 배경을 `#00FF00`으로 투명화/지우기**합니다. 가려진 부분(손잡이, 뒤통수, 안쪽 원단)은 온전하게 완성해 그립니다.

| 파일명 | 부위 | 설명 및 프롬프트 지시문 |
|---|---|---|
| `c01_hair_back.png` | 뒷머리 | `Extract ONLY the back hair layer of Liana's brown bob hair that sits behind the face and neck. Complete the hidden parts behind the head. NO face, NO body, NO clothing. Solid green (#00FF00).` |
| `c02_hair_front.png` | 앞·옆머리 | `Extract ONLY the front bangs and side hair tufts. Hollow transparent center where the face goes. NO skin, NO eyes, NO face. Solid green.` |
| `c03_face_neutral.png` | 기본 표정 | `Extract ONLY the facial expression: neat brown eyebrows, open clear brown anime eyes, and small neutral mouth. NO face skin, NO head contour, NO hair, floating on pure solid green.` |
| `c04_face_blink.png` | 눈 감음 | `Exact same position as c03: neat brown eyebrows, closed resting eye lines (^ ^ / curved blink lines), small neutral mouth. NO skin, NO hair. Solid green.` |
| `c05_face_attack.png` | 공격 표정 | `Exact same position as c03: sharply angled determined eyebrows, focused wide attacking brown eyes, open shouting battle mouth. NO skin, NO hair. Solid green.` |
| `c06_top.png` | 상의 | `Extract ONLY the upper clothing: silver breastplate, brown leather shoulder straps, and white tunic chest. HOLLOW shell: NO human neck, NO arms, NO skin inside. Solid green.` |
| `c07_skirt_front.png` | 튜닉 앞자락 | `Extract ONLY the front waist belt and the front-falling flap of the white tunic over the thighs. Hollow shell, NO legs, NO torso flesh. Solid green.` |
| `c08_skirt_back.png` | 튜닉 뒷자락 | `Extract ONLY the back hem of the white tunic hanging behind the legs. Hollow cloth layer, NO legs, NO torso. Solid green.` |
| `c09_sleeve_near.png` | 가까운 소매 | `Extract ONLY the rolled-up white tunic sleeve on the viewer-near upper arm. Hollow cylinder cloth, NO arm skin inside. Solid green.` |
| `c10_sleeve_far.png` | 먼 소매 | `Extract ONLY the rolled-up white tunic sleeve on the viewer-far upper arm. Hollow cylinder cloth, NO arm skin inside. Solid green.` |
| `c11_pants_near.png` | 가까운 다리 의상 | `Extract ONLY the clothing of the viewer-near leg: navy trousers and brown leather boot. Hollow shell, NO pelvis, NO far leg. Solid green.` |
| `c12_pants_far.png` | 먼 다리 의상 | `Extract ONLY the clothing of the viewer-far leg: navy trousers and brown leather boot. Hollow shell, NO pelvis, NO near leg. Solid green.` |
| `c13_weapon_main.png` | 칼 | `Extract ONLY the steel longsword in its exact held position. Complete the full hilt and pommel normally covered by the hand (NO hand fingers drawn on the sword). Solid green.` |
| `c14_weapon_sub.png` | 방패 | `Extract ONLY the wooden kite shield with winged helmet crest. Draw the complete shield including straps behind it (NO arm drawn on the shield). Solid green.` |

---

## 🔮 2. 향후 다른 종족 바디 확장 키워드 모음

추후 리아나 테스트가 완료된 후 다른 종족 바디(`b00`) 제작 시 교체하여 삽입할 종족별 프롬프트 블록입니다:

- **수인족 (Beastkin)**:
  `beastkin folk base, fluffy animal ears on top of head, expressive fluffy animal tail on pelvis, beautiful anime face structure, agile athletic proportion`
- **숲의 종족 (Forest)**:
  `forest folk base, long pointed elegant elf ears extending outwards from head, slender graceful stature, emerald nature presence`
- **땅의 종족 (Earth)**:
  `earth folk base, dual mechanical cybernetic prosthetic arms on BOTH left and right arms from shoulders to fingers with visible brass gears and hydraulics, 100% natural organic legs and torso`
- **비행족 (Avian)**:
  `avian folk base, majestic feathered wings spread gracefully on back, feather hair accents, light airy presence`

