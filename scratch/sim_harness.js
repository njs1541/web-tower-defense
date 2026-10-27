
let currentMockState = {};

const document = {
  getElementById: (id) => {
    return {
      value: currentMockState[id] !== undefined ? currentMockState[id] : '',
      checked: currentMockState[id] !== undefined ? currentMockState[id] : false,
      innerHTML: '',
      textContent: '',
      style: {}
    };
  },
  querySelector: (sel) => {
    if (sel.includes('gen-mode')) {
      return { value: currentMockState['gen-mode'] || 'illust' };
    }
    return null;
  },
  querySelectorAll: () => []
};


        function switchTab(tabId, btnEl) {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const targetBtn = btnEl || event?.target || document.querySelector(`button[onclick*="'${tabId}'"]`);
            if (targetBtn) targetBtn.classList.add('active');
            
            const targetTab = document.getElementById(tabId);
            if (targetTab) targetTab.classList.add('active');
        }

        function goToEarthDeepDive() {
            // 4번 종족 탭 활성화
            switchTab('tab-race');
            // 종족 탭 내 땅의 종족 심층 분석 영역으로 스크롤
            setTimeout(() => {
                const deepDiveEl = document.querySelector('#tab-race h3');
                if (deepDiveEl) {
                    deepDiveEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }

        function goToBeastkinDeepDive() {
            // 4번 종족 탭 활성화
            switchTab('tab-race');
            // 종족 탭 내 수인족 심층 분석 영역으로 스크롤
            setTimeout(() => {
                const deepDiveEl = document.getElementById('beastkin-deep-dive');
                if (deepDiveEl) {
                    deepDiveEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }

        function goToForestDeepDive() {
            // 4번 종족 탭 활성화
            switchTab('tab-race');
            // 종족 탭 내 숲의 종족 심층 분석 영역으로 스크롤
            setTimeout(() => {
                const deepDiveEl = document.getElementById('forest-deep-dive');
                if (deepDiveEl) {
                    deepDiveEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }

        function goToAvianDeepDive() {
            switchTab('tab-race');
            // 종족 탭 내 비행족 심층 분석 영역으로 스크롤
            setTimeout(() => {
                const deepDiveEl = document.getElementById('avian-deep-dive');
                if (deepDiveEl) {
                    deepDiveEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }

        function goToHumanDeepDive() {
            switchTab('tab-race');
            // 종족 탭 내 인간족 심층 분석 영역으로 스크롤
            setTimeout(() => {
                const deepDiveEl = document.getElementById('human-deep-dive');
                if (deepDiveEl) {
                    deepDiveEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }

        const GRADE_PROMPTS = {
            'C': "simple apprentice uniform, modest leather gear, calm standing pose, looking at viewer, flat simple gradient background, no complex aura, clean lineart, soft cel-shading",
            'UC': "formal junior uniform, neat cape, gentle pose, clean composition, soft gradient studio background, no magical effects",
            'R': "formal knight attire with flowing cloak, holding signature weapon, 3/4 angled battle pose, subtle floating elemental light particles, mild aura",
            'SR': "ornate attire with intricate gold embroidery and lace, dynamic combat pose with fluttering hair, distinct glowing elemental rune circle floating behind, vibrant magical aura",
            'UR': "majestic paladin armor with platinum accents, breathtaking royal costume, low angle heroic pose, multiple glowing holy halo rings, grand sanctuary background with radiant light pillars",
            'U': "transcendent cosmic goddess attire, floating in mid-air levitation, majestic celestial wings, enormous sacred halo, grand galaxy nebula background with stardust and spatial distortion"
        };

        const ELEMENT_PROMPTS = {
            'fire': "crimson red and warm amber color palette, burning flame effects, floating glowing embers, heat distortion, fire magic motif",
            'frost': "cyan and icy blue with silver color palette, floating crystal frost shards, glowing snowflake particles, sub-zero aura, ice magic motif",
            'shock': "neon violet and electric blue color palette, crackling lightning arcs, static plasma sparks, magnetic ring effects, thunder magic motif",
            'holy': "pure white and brilliant golden color palette, radiant sunburst light beams, glowing divine halo, pure white feathers, holy sacred motif",
            'void': "deep cosmic indigo and magenta color palette, dimensional space rift, sparkling stardust particles, cosmic nebula galaxy motif"
        };

        const ROLE_PROMPTS = {
            'guardian': "guardian class, holding a massive tower shield and longsword, heavy metal breastplate and gauntlets, solid grounded guarding pose",
            'ranger': "ranger sniper class, holding an ornate enchanted bow and mechanical crossbow, leather cape and thigh quiver, nimble aiming pose",
            'mage': "mage sorceress class, holding an ornate glowing rune staff and floating grimoire, elegant flowing dress with glowing magical circlet, casting spell pose",
            'tactician': "tactician alchemist class, wearing tactical goggles and tool belt with glowing potion flasks and mechanical gears, smart observing pose"
        };

        const RACE_PROMPTS = {
            'forest': "forest folk, long pointed elf ears, emerald foliage accents, graceful nature presence",
            'earth': "earth folk, dual cybernetic mechanical prosthetic arms on BOTH arms with visible brass gears and hydraulics, natural organic legs",
            'beastkin': "beastkin folk, fluffy animal ears on head and fluffy tail, feline fangs, agile wild presence",
            'human': "human folk, elegant imperial styling, versatile fantasy aura",
            'avian': "avian folk, majestic feathered wings spread on back, feather accents, soaring aerial presence",
            'mutation': "unique mutant anomaly, rare contrasting exotic hybrid features"
        };

                // 💃 몸매 / 체형 명세 (종족 자동 + 슬랜더, 표준, 글래머, 메가 글래머, 톰보이, 로리/쁘띠)
        // 🌍 종족별 기본 표준 체형 명세 (종족 자동 선택 시 적용)
        const RACE_BODY_SPECS = {
                    'earth': "shortstack voluptuous build, 150cm height, 6.0 head ratio, huge bust (E-G cup), wide curvy hips, thick thighs, cybernetic prosthetic arm",
                    'beastkin': "athletic sensual mature build, 165cm height, 7.0 head ratio, toned curves, voluptuous bust, fluffy animal ears and tail, canine fangs",
                    'forest': "tall slender elegant model build, 172cm height, 7.8 head ratio, long graceful legs, voluptuous bust, pointed elf ears",
                    'avian': "petite curvy winged build, 152cm height, 6.2 head ratio, voluptuous bust, graceful posture, majestic wings on back",
                    'human': "balanced perfect hourglass model build, 164cm height, 7.2 head ratio, natural voluptuous D-F cup bust, feminine waist and hip curves"
                };

        const BODY_TYPE_SPECS = {
            'slender': "slender graceful adult female build, 166cm height, 7.3 head ratio, modest A-B cup bust, thin feminine waist, long slender legs, graceful posture",
            'standard': "balanced perfect standard adult female build, 163cm height, 7.0 head ratio, natural healthy feminine curves, natural C-cup bust, harmonious waist-to-hip ratio, toned shapely legs",
            'glamour': "voluptuous curvy hourglass adult female build, 165cm height, 7.0 head ratio, heavy D-E cup bust, narrow waist, wide feminine curvy hips, thick alluring thighs",
            'mega_glamour': "hyper-voluptuous extreme hourglass adult female build, 167cm height, 6.8 head ratio, gigantic heavy breasts (F-H cup), tiny corseted waist, extremely wide curvy hips, plump thick thighs, deeply alluring mature feminine silhouette",
            'tomboy': "athletic toned tomboy adult female build, 165cm height, 7.0 head ratio, defined 11-line abs, firm compact bust, toned athletic muscles, dynamic healthy silhouette, androgynous charming posture",
            'petite': "petite adult female build, compact delicate stature, 145cm height, 5.8 head ratio, small feminine frame, slender waist and hips, graceful cute proportions (adult female)"
        };

const STYLE_PROMPTS = {
            'supreme_gold_chain': "alluring sensual apex costume, ornate glowing gold chain bikini armor with platinum trims, jeweled chest piece with cleavage cutout, micro high-leg armor plating exposing hips, translucent white sheer silk veil draped over shoulders and flowing behind, sheer lace-up garter stockings with gold embroidery, golden choker with glowing sacred crest gem",
            'supreme_cyber_highleg': "futuristic high-leg cybernetic bodysuit, transparent holographic chest panels, micro high-cut hip exposure with glowing cybernetic lines, glossy patent leather, snug thigh strap holster squeeze, translucent cyber stockings",
            'supreme_celestial_lingerie': "sheer ethereal starlight lingerie, translucent flowing organza nebula robe, sacred golden chain jewelry across chest and hips, floating gracefully in the air, enormous celestial halo rings, stardust particles",
            'style_a': "tight shiny black latex and patent leather bodysuit with glossy specular highlights, chest leather body harness with metallic buckles, keyhole cutout, thigh holster with snug leather thigh strap squeeze, asymmetrical thigh-high stockings, black leather choker with ring",
            'style_b': "elegant dark fantasy silk dress, translucent sheer lace fabric over chest and shoulders, deep teardrop keyhole cutout, extremely high side slit exposing hip, delicate lace-up black garter belt, sheer black stockings with floral embroidery",
            'style_hybrid': "fantasy tactical hybrid costume, leather bodysuit layered under an elegant high-slit sheer silk coat, metallic armor buckles and lace-up garter details",
            'style_classic': "formal knight officer tunic and light breastplate armor, neat shoulder cape, high-waist leather shorts, silver filigree details, polished combat boots",
            'curvy': "alluring sensual costume, flattering feminine design",
            'slender': "graceful elegant costume, slim fitting design",
            'boyish': "handsome dashing tactical costume, sharp tailored design"
        };

        const NEGATIVE_PROMPT_FIXED = "cropped, out of frame, cut off head, cut off feet, cut off legs, cut off shoes, close-up, portrait, bust shot, upper body only, medium shot, zoom in, extra arms, extra legs, extra limbs, third arm, four arms, mutated hands, poorly drawn hands, missing limbs, fused limbs, malformed limbs, cloned limbs, floating limbs, extra fingers, deformed fingers, fused fingers, child, kid, underage, loli, male, man, boy, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry";

        // 땅의 종족 5개 등급 검증 완료 골든 프롬프트 (Golden Prompts - 100% 검증 성공 세트)
        const EARTH_GOLDEN_PROMPTS = {
            'C': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, short height petite adult female, curvy voluptuous bust, modest denim mechanic overalls, loose cotton t-shirt with hidden heavy cleavage, honey blonde messy short hair, amber eyes, determined cute expression, grease mark on nose, exposed rudimentary brass mechanical prosthetic right forearm and robotic hand with visible gears, leather tool belt with wrenches, oil smudge on cheek, steampunk safety goggles on forehead, heavy mechanic work boots, standing on stone floor, clean lineart, vibrant cel-shading, cinematic lighting",
            'UC': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, short height petite adult female, curvy voluptuous bust, tidy junior engineer uniform, canvas utility vest, fitted work trousers, subtle curves, exposed brass mechanical prosthetic forearm and hand with visible gears, clean safety gloves, brass measuring caliper, sturdy leather boots, clean lineart, vibrant cel-shading, cinematic lighting",
            'R': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, short height petite adult female, curvy voluptuous bust, thick thighs, slim-fit thermal compression undersuit, partially unzipped front deep cleavage, leather chest harness, auburn ponytail hair, focused hazel eyes, confident smirk, elaborate brass hydraulic prosthetic cybernetic right arm with visible pistons and brass gears, buckled leather thigh holster with firearm, cargo shorts, knee-high tactical leather boots, holding an iron tower shield and steel longsword, stone fortress dungeon background with crackling purple elemental lightning aura, clean lineart, vibrant cel-shading, cinematic lighting",
            'SR': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, short height petite adult female, curvy voluptuous hourglass figure, huge breasts, thick thighs, shiny black latex high-leg bodysuit, deep keyhole cleavage cutout, buckled leather body harness, leather thigh straps with flesh pinch, cropped mechanic bomber jacket hanging loosely off shoulders, silver twintail hair, sharp crimson eyes, confident daring smile, advanced titanium cybernetic prosthetic left arm with glowing purple neon tubes and mechanical joints, glossy black latex thigh-high platform boots, floating magical rune circle and lightning sparks, clean lineart, vibrant cel-shading, cinematic lighting",
            'UR': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, short height petite adult female, voluptuous hourglass figure, huge breasts, thick thighs, alluring sensual apex costume, ornate glowing gold chain bikini mechanical armor, jeweled chest piece, micro high-leg armor plating exposing toned hips and thighs, luxury platinum and gold-plated mechanical cybernetic prosthetic right arm with visible intricate internal gears and robotic fingers, mechanical cybernetic thigh joint on right leg, translucent sheer white silk veil draped over shoulders and flowing behind, golden blonde drill pigtails, royal purple eyes, arrogant seductive smile, high-heel armored platform boots, glowing golden holy halo rings, grand sanctuary cathedral with light pillars, clean lineart, vibrant cel-shading, cinematic lighting",
            'U': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, floating in mid-air levitation, short height petite adult female, voluptuous divine goddess figure, huge breasts, thick thighs, bare midriff, bare waist, bare hips, bare thighs, bare skin, divine supreme mecha goddess, revealing micro slingshot lingerie, delicate golden chain straps barely covering modesty, ornate gold and diamond body chains draped over bare waist and hips, deep exposed cleavage and toned stomach, sheer ethereal nebula silk veil draped behind back only, transcendent glowing crystalline cybernetic prosthetic left arm made of translucent neon energy and intricate golden nano-circuits, cosmic prismatic glowing long twintail hair fluttering, golden sacred eyes, divine loving seductive expression, floating autonomous mechanical orbit bit weapons, multi-layered golden cybernetic halo rings, cosmic stardust galaxy nebula background, clean lineart, vibrant cel-shading, cinematic lighting, no full bodysuits, no tights, no jumpsuit, no hat, no heavy dress"
        };

        // 수인족 5개 등급 검증 완료 골든 프롬프트 (Golden Prompts - 100% 검증 세트)
        const BEASTKIN_GOLDEN_PROMPTS = {
            'C': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, tall slender adult female, 165cm height, athletic slim figure, modest bust, athletic sleeveless white crop top, snug black sports leggings hugging toned hips and slender long legs, exposed toned midriff and navel, sturdy leather utility waist belt with pouches and small hunting knife, fingerless gloves, fluffy wolf animal ears on head, expressive fluffy wolf tail, energetic amber eyes, cute canine fangs, brown short wolf-cut hair, durable tactical combat boots, standing on grassy plain ground, clean lineart, vibrant cel-shading, cinematic lighting",
            'UC': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, tall slender adult female, 165cm height, athletic figure, neat junior ranger uniform, fitted dark green crop vest, flexible compression shorts, exposed athletic midriff, fluffy fox animal ears on head, bushy orange fox tail with white tip, bright green eyes, mischievous playful smile, leather utility leg straps, sturdy light leather boots, clean lineart, vibrant cel-shading, cinematic lighting",
            'R': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, tall slender adult female, 165cm height, curvy athletic body, voluptuous bust, tight black leather combat catsuit, front zipper pulled down revealing deep cleavage, exposed toned collarbone, buckled brown leather thigh holster with firearm causing snug flesh indentation, cargo short shorts layered over suit, fluffy cheetah animal ears on head, slender spotted feline tail, focused golden eyes with slit pupils, charming sharp fangs, wild black ponytail hair, high-top tactical running boots, holding twin curved daggers, low combat stance, spark particles, clean lineart, vibrant cel-shading, cinematic lighting",
            'SR': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, tall slender adult female, 165cm height, voluptuous curvy hourglass figure, huge breasts, thick thighs, shiny black patent leather and latex high-leg catsuit, bold underboob cutout, leather chest harness with metallic buckles, snug thigh straps causing deep flesh pinch on thick thighs, fluffy black panther animal ears on head, long sleek panther tail with metallic tip, sharp crimson slit eyes, predatory seductive smirk, cute pointed fangs, glossy jet black twin braids hair, glowing purple neon claw gauntlets, knee-high glossy platform boots, floating magical shadow rune circle and neon purple sparks, clean lineart, vibrant cel-shading, cinematic lighting",
            'UR': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, tall slender adult female, 168cm height, voluptuous curvy hourglass figure, huge breasts, thick thighs, alluring sensual apex costume, ornate golden chain micro high-leg catsuit with platinum feline accents, jeweled chest brooch with deep cleavage, micro high-leg hip cutouts exposing toned hips and pelvic bones, luxurious tiger fur collar shoulder cape flowing behind, magnificent fluffy white tiger animal ears with black stripes, thick majestic striped tiger tail, royal blue glowing eyes, confident seductive queen expression, long silver wavy hair, high-heel armored platform boots, glowing golden sacred feline aura and floating runic halo rings, ancient temple throne background, clean lineart, vibrant cel-shading, cinematic lighting",
            'U': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, floating in mid-air levitation, tall slender adult female, 168cm height, voluptuous divine goddess figure, huge breasts, thick thighs, bare midriff, bare waist, bare hips, bare thighs, bare skin, supreme primal beast goddess, revealing micro silk slingshot lingerie, delicate golden chain straps barely covering modesty, ornate gold and emerald body chains draped across bare waist and hips, nine majestic glowing ethereal celestial fox tails fanning out behind her, fluffy sacred white fox ears with golden tips, divine golden slit eyes, otherworldly loving goddess expression, cosmic prismatic cascading long hair fluttering in levitation, glowing spiritual foxfire flames floating around, multi-layered primal sacred halo rings, cosmic mystical forest nebula background, clean lineart, vibrant cel-shading, cinematic lighting, no full bodysuits, no tights, no jumpsuit, no heavy dress"
        };

        // 숲의 종족 5개 등급 검증 완료 골든 프롬프트 (Golden Prompts - 스타일 B 시스루 레이스 & 가터벨트 100% 매핑 세트)
        const FOREST_GOLDEN_PROMPTS = {
            'C': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, tall slender adult female, 170cm height, 8 heads tall model proportions, voluptuous bust, long pointed elf ears, emerald green eyes, gentle cute smile, emerald green wavy long hair, simple forest green linen mini tunic dress, modest cleavage, short green shoulder capelet, brown leather waist belt with small herbal pouch, knee-high sturdy brown leather boots, holding a curved wooden staff adorned with glowing ivy, standing on mossy stone ground in sunlit forest, clean lineart, vibrant cel-shading, cinematic lighting",
            'UC': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, tall slender adult female, 170cm height, 8 heads tall model proportions, curvy bust, long pointed elf ears, turquoise eyes, neat junior forest scout uniform, fitted olive green silk tunic, light leaf-patterned vest, slender long legs, brown leather thigh strap, soft leather traveling boots, holding a sleek wooden shortbow, clean lineart, vibrant cel-shading, cinematic lighting",
            'R': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, tall slender adult female, 172cm height, voluptuous hourglass figure, huge breasts, slender waist, long pointed elf ears, focused golden eyes, confident charming smile, platinum blonde long braid hair, fitted emerald green silk tunic dress, modest deep cleavage, high side slit exposing curvy hip and slender thigh, delicate vine leg wraps causing slight flesh indentation on bare thigh, brown leather thigh quiver with magical glowing arrows, elegant enchanted wooden longbow, knee-high strappy leather sandals, glowing green elemental wind particles, misty ancient woodland background, clean lineart, vibrant cel-shading, cinematic lighting",
            'SR': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, tall slender adult female, 174cm height, voluptuous hourglass figure, huge breasts, slender waist, thick curvy hips, long pointed elf ears, seductive amethyst eyes, captivating alluring smile, cascading silver hair with glowing jade hairpin, seductive dark emerald sheer floral lace dress, deep teardrop keyhole cleavage cutout, extremely high side slit exposing entire hip and thigh, delicate black and green lace garter belt, sheer lace-up floral thigh-high stockings, strappy emerald high-heel sandals, holding an ornate glowing crystal botanical rune staff, floating enchanted fireflies and glowing flower petal magic circle, clean lineart, vibrant cel-shading, cinematic lighting",
            'UR': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, tall slender adult female, 175cm height, voluptuous hourglass figure, huge breasts, slender waist, wide curvy hips, long pointed elf ears, royal emerald eyes, majestic seductive empress expression, iridescent golden blonde long hair adorned with gold leaf tiara, alluring sensual apex costume, ornate golden leaf chain bikini dress, jeweled emerald chest piece with deep cleavage, micro high-leg side slit exposing toned hips and pelvic bones, ultra-sheer translucent white and gold organza cape flowing gracefully behind to the ground, delicate golden leaf garter straps, elegant strappy gold high-heel sandals, massive glowing world tree rune halo rings floating behind, ancient sacred grove sanctuary background with radiant sunbeams, clean lineart, vibrant cel-shading, cinematic lighting",
            'U': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, floating in mid-air levitation, tall slender adult female, 175cm height, voluptuous divine goddess figure, huge breasts, slender waist, wide curvy hips, bare midriff, bare waist, bare hips, bare thighs, bare skin, long pointed translucent crystal elf ears, divine glowing sacred emerald eyes, blissful loving goddess expression, cosmic pastel rainbow cascading ethereal hair fluttering in levitation, supreme primal genesis flora goddess, revealing micro blooming flower slingshot lingerie, delicate golden chain straps barely covering modesty, ornate gold and emerald botanical body chains draped across bare waist and hips, glowing translucent spiritual flower petal wings radiating from back, floating in air, delicate gold vine anklets on bare feet, giant glowing cosmic world tree nebula background with floating luminous pollen and butterflies, clean lineart, vibrant cel-shading, cinematic lighting, no full bodysuits, no tights, no jumpsuit, no heavy dress"
        };

        // 비행족 5개 등급 검증 완료 골든 프롬프트 (Golden Prompts - 100% 검증 세트)
        const AVIAN_GOLDEN_PROMPTS = {
            'C': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, short height petite adult female, 150cm height, 6 heads tall, curvy voluptuous bust, huge breasts, slender waist, small pure white feathered angel wings on back, gentle energetic expression, sky blue eyes, short sky blue bob hair with white feather hairpin, light sky blue pleated mini flare tunic dress, modest cleavage, short white feather capelet, ribbon lace-up short boots, floating slightly above cloudy ground, clean lineart, vibrant cel-shading, cinematic lighting",
            'UC': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, short height petite adult female, 150cm height, curvy voluptuous bust, white feathered wings on back, neat junior valkyrie scout uniform, fitted white silk tunic, light feather pauldrons, lace-up boots, hovering gently, clean lineart, vibrant cel-shading, cinematic lighting",
            'R': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, floating in air levitation, short height petite adult female, 152cm height, voluptuous hourglass figure, huge breasts, slender waist, round hips, medium spread pure white feathered wings on back, confident focused expression, turquoise eyes, long white ponytail hair fluttering in wind, tight flying white silk tunic dress with deep side slits fluttering open, deep exposed cleavage, buckled leather body harness, winged leather thigh garter strap causing snug flesh indentation, lace-up high heels, floating feathers, blue sky cloud background, clean lineart, vibrant cel-shading, cinematic lighting",
            'SR': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, floating in air levitation, short height petite adult female, 153cm height, voluptuous hourglass figure, huge breasts, slender waist, thick curvy hips, large majestic black feathered fallen angel wings spread wide, seductive wicked smile, crimson eyes, long raven black twintails fluttering, alluring sheer translucent black chiffon dress, deep plunging v-neck cleavage, extremely high side slit exposing hip and thigh, buckled leather garter belt, sheer lace-up thigh-high stockings, black platform high heels, floating dark purple runic halo and black feather aura, clean lineart, vibrant cel-shading, cinematic lighting",
            'UR': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, floating in air levitation, short height petite adult female, 155cm height, voluptuous hourglass figure, huge breasts, slender waist, wide curvy hips, six gigantic radiant pure white and gold angel wings spread magnificently, royal serene empress expression, golden sacred eyes, shimmering golden blonde long hair adorned with gold halo, alluring sensual apex costume, ornate platinum and gold feather chain bikini armor, jeweled diamond chest piece with deep cleavage, micro high-leg armor plating exposing toned hips, ultra-sheer translucent white silk veil flowing to the ground, delicate gold feather garter, gold strappy high heels, multi-layered rotating holy halo rings, grand cloud sanctuary background with sunbeams, clean lineart, vibrant cel-shading, cinematic lighting",
            'U': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, floating high in mid-air levitation, short height petite adult female, 155cm height, voluptuous divine goddess figure, huge breasts, slender waist, wide curvy hips, bare midriff, bare waist, bare hips, bare thighs, bare skin, twelve gigantic glowing prismatic aurora crystal wings radiating outwards, divine loving ethereal goddess expression, sacred prismatic glowing eyes, cascading cosmic pastel hair fluttering in zero gravity, supreme cosmic sky genesis goddess, revealing micro stardust feather slingshot lingerie, delicate golden and diamond body chains draped across bare waist and hips, delicate gold vine anklets on bare feet, giant glowing cosmic celestial halo, stardust nebula space background with shooting stars, clean lineart, vibrant cel-shading, cinematic lighting, no full bodysuits, no tights, no jumpsuit, no heavy dress"
        };

        // 인간족 5개 등급 검증 완료 골든 프롬프트 (Golden Prompts - 하이브리드 제복 100% 매핑 세트)
        const HUMAN_GOLDEN_PROMPTS = {
            'C': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, average height adult female, 162cm height, 7 heads tall, balanced voluptuous bust, slender waist, gentle determined expression, warm brown eyes, short chestnut brown hair with neat side bangs, formal imperial apprentice knight uniform, navy blue and pure white pleated mini tunic dress, modest cleavage, light polished silver breastplate, leather utility waist belt with decorative sword scabbard, holding an ornate training rapier, knee-high sturdy brown leather boots, standing on stone fortress courtyard, clean lineart, vibrant cel-shading, cinematic lighting",
            'UC': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, average height adult female, 163cm height, curvy bust, neat junior scout uniform, fitted navy blue silk tunic, silver shoulder pauldron, leather utility straps, knee-high boots, holding a mechanical crossbow, clean lineart, vibrant cel-shading, cinematic lighting",
            'R': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, average height adult female, 164cm height, voluptuous hourglass figure, huge breasts, slender waist, round hips, confident charismatic smile, sapphire blue eyes, long blonde hair tied in high ponytail fluttering in wind, tight imperial royal guard officer uniform coat, square-cut neckline with deep exposed cleavage, fitted leather shorts, buckled leather thigh holster with firearm causing snug flesh indentation, polished silver pauldrons, holding a silver rapier, high-top leather officer boots, fluttering coat tails, castle ramparts background with golden light particles, clean lineart, vibrant cel-shading, cinematic lighting",
            'SR': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, average height adult female, 165cm height, voluptuous curvy hourglass figure, huge breasts, slender waist, thick curvy hips, enchanting confident smirk, fiery ruby red eyes, cascading raven black wavy hair, apex hybrid tactical uniform, shiny black glossy latex bodysuit layered under luxurious deep burgundy silk imperial coat, bold deep diamond keyhole cleavage cutout, crossed golden buckled leather body harness, coat with extreme high side slit exposing hip, buckled leather lingerie garter belt, sheer lace-up thigh-high stockings, black platform high heels, holding an ornate glowing runic longsword, floating grand imperial magic circle and glowing red sparks, clean lineart, vibrant cel-shading, cinematic lighting",
            'UR': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, average height adult female, 166cm height, voluptuous hourglass figure, huge breasts, slender waist, wide curvy hips, royal majestic empress expression, sacred golden eyes, luxurious golden blonde hair adorned with intricate gold tiara crown, alluring sensual apex costume, ornate glowing gold and platinum chain bikini paladin armor, jeweled chest brooch with deep cleavage, micro high-leg armor plating exposing toned hips and pelvic bones, ultra-sheer translucent white royal silk cape flowing to the ground, delicate gold chain garter straps, armored high-heel boots, multi-layered rotating golden holy halo rings, grand cathedral sanctuary with radiant sunbeams, clean lineart, vibrant cel-shading, cinematic lighting",
            'U': "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, floating in mid-air levitation, average height adult female, 167cm height, voluptuous divine goddess figure, huge breasts, slender waist, wide curvy hips, bare midriff, bare waist, bare hips, bare thighs, bare skin, supreme genesis mother of humanity goddess, revealing micro pure white sacred starlight slingshot lingerie, delicate golden and diamond star body chains draped across bare waist and hips, cascading celestial pastel cosmic hair fluttering in zero gravity, divine loving motherly expression, sacred glowing golden starlight eyes, giant glowing twelve-pointed golden cosmic star compass halo, stardust nebula galaxy background with shooting stars, delicate gold vine anklets on bare feet, clean lineart, vibrant cel-shading, cinematic lighting, no full bodysuits, no tights, no jumpsuit, no heavy dress, no wings"
        };

        let currentActiveEarthPreset = 'C';
        let currentActiveBeastPreset = 'C';
        let currentActiveForestPreset = 'C';
        let currentActiveAvianPreset = 'C';
        let currentActiveHumanPreset = 'C';

        function applyEarthGradePreset(grade, btnEl) {
            if (document.getElementById('gen-body-type')) document.getElementById('gen-body-type').value = 'auto';
            // 버튼 액티브 클래스 갱신
            document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
            if (btnEl) {
                btnEl.classList.add('active');
            } else {
                const targetBtn = document.getElementById('preset-btn-' + grade);
                if (targetBtn) targetBtn.classList.add('active');
            }

            currentActiveEarthPreset = grade;
            document.getElementById('gen-race').value = 'earth';
            document.getElementById('gen-grade').value = grade;
            
            if (grade === 'C' || grade === 'UC') {
                document.getElementById('gen-style').value = 'style_classic'; if(document.getElementById('gen-body-type')) document.getElementById('gen-body-type').value = 'auto';
                document.getElementById('gen-role').value = 'tactician';
                document.getElementById('gen-details').value = 'honey blonde messy short hair, amber eyes, brass prosthetic arm';
            } else if (grade === 'R') {
                document.getElementById('gen-style').value = 'style_a';
                document.getElementById('gen-role').value = 'guardian';
                document.getElementById('gen-details').value = 'auburn ponytail hair, focused hazel eyes, brass hydraulic arm';
            } else if (grade === 'SR') {
                document.getElementById('gen-style').value = 'style_a';
                document.getElementById('gen-role').value = 'tactician';
                document.getElementById('gen-details').value = 'silver twintails, sharp crimson eyes, titanium cybernetic arm';
            } else if (grade === 'UR') {
                document.getElementById('gen-style').value = 'supreme_gold_chain';
                document.getElementById('gen-role').value = 'guardian';
                document.getElementById('gen-details').value = 'golden blonde drill pigtails, royal purple eyes, platinum cybernetic arm';
            } else if (grade === 'U') {
                document.getElementById('gen-style').value = 'supreme_celestial_lingerie';
                document.getElementById('gen-role').value = 'tactician';
                document.getElementById('gen-details').value = 'cosmic prismatic hair, golden sacred eyes, crystalline cybernetic arm, micro slingshot body chains';
            }
            
            updatePrompt();
            
            // 프롬프트 결과 영역으로 부드럽게 스크롤
            document.querySelector('.prompt-output-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        function applyBeastkinGradePreset(grade, btnEl) {
            if (document.getElementById('gen-body-type')) document.getElementById('gen-body-type').value = 'auto';
            // 버튼 액티브 클래스 갱신
            document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
            if (btnEl) {
                btnEl.classList.add('active');
            } else {
                const targetBtn = document.getElementById('preset-btn-beast-' + grade);
                if (targetBtn) targetBtn.classList.add('active');
            }

            currentActiveBeastPreset = grade;
            document.getElementById('gen-race').value = 'beastkin';
            document.getElementById('gen-grade').value = grade;

            if (grade === 'C' || grade === 'UC') {
                document.getElementById('gen-style').value = 'slender';
                document.getElementById('gen-role').value = 'ranger';
                document.getElementById('gen-details').value = 'fluffy wolf ears, wolf tail, amber eyes, canine fangs, combat boots';
            } else if (grade === 'R') {
                document.getElementById('gen-style').value = 'style_a';
                document.getElementById('gen-role').value = 'ranger';
                document.getElementById('gen-details').value = 'cheetah ears, spotted tail, golden slit eyes, cleavage leather catsuit';
            } else if (grade === 'SR') {
                document.getElementById('gen-style').value = 'style_a';
                document.getElementById('gen-role').value = 'guardian';
                document.getElementById('gen-details').value = 'panther ears, sleek tail, crimson slit eyes, latex underboob catsuit, neon claws';
            } else if (grade === 'UR') {
                document.getElementById('gen-style').value = 'supreme_gold_chain';
                document.getElementById('gen-role').value = 'guardian';
                document.getElementById('gen-details').value = 'white tiger ears, striped tail, blue eyes, gold chain micro highleg, tiger fur cape';
            } else if (grade === 'U') {
                document.getElementById('gen-style').value = 'supreme_celestial_lingerie';
                document.getElementById('gen-role').value = 'mage';
                document.getElementById('gen-details').value = 'nine glowing fox tails, white fox ears, golden slit eyes, micro slingshot lingerie';
            }

            updatePrompt();
            document.querySelector('.prompt-output-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        function applyForestGradePreset(grade, btnEl) {
            if (document.getElementById('gen-body-type')) document.getElementById('gen-body-type').value = 'auto';
            // 버튼 액티브 클래스 갱신
            document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
            if (btnEl) {
                btnEl.classList.add('active');
            } else {
                const targetBtn = document.getElementById('preset-btn-forest-' + grade);
                if (targetBtn) targetBtn.classList.add('active');
            }

            currentActiveForestPreset = grade;
            document.getElementById('gen-race').value = 'forest';
            document.getElementById('gen-grade').value = grade;

            if (grade === 'C' || grade === 'UC') {
                document.getElementById('gen-style').value = 'style_classic'; if(document.getElementById('gen-body-type')) document.getElementById('gen-body-type').value = 'auto';
                document.getElementById('gen-role').value = 'mage';
                document.getElementById('gen-details').value = 'long pointed elf ears, emerald green eyes, wavy green hair, wooden staff';
            } else if (grade === 'R') {
                document.getElementById('gen-style').value = 'style_b';
                document.getElementById('gen-role').value = 'ranger';
                document.getElementById('gen-details').value = 'long pointed elf ears, golden eyes, blonde braid, side slit tunic, vine leg wraps';
            } else if (grade === 'SR') {
                document.getElementById('gen-style').value = 'style_b';
                document.getElementById('gen-role').value = 'mage';
                document.getElementById('gen-details').value = 'long pointed elf ears, amethyst eyes, silver hair, sheer lace dress, teardrop keyhole, lace garter';
            } else if (grade === 'UR') {
                document.getElementById('gen-style').value = 'supreme_gold_chain';
                document.getElementById('gen-role').value = 'mage';
                document.getElementById('gen-details').value = 'long pointed elf ears, royal emerald eyes, golden hair, tiara, gold leaf chain bikini, organza cape';
            } else if (grade === 'U') {
                document.getElementById('gen-style').value = 'supreme_celestial_lingerie';
                document.getElementById('gen-role').value = 'mage';
                document.getElementById('gen-details').value = 'long crystal elf ears, glowing emerald eyes, rainbow hair, micro floral slingshot, flower wings';
            }

            updatePrompt();
            document.querySelector('.prompt-output-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        function applyAvianGradePreset(grade, btnEl) {
            if (document.getElementById('gen-body-type')) document.getElementById('gen-body-type').value = 'auto';
            // 버튼 액티브 클래스 갱신
            document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
            if (btnEl) {
                btnEl.classList.add('active');
            } else {
                const targetBtn = document.getElementById('preset-btn-avian-' + grade);
                if (targetBtn) targetBtn.classList.add('active');
            }

            currentActiveAvianPreset = grade;
            document.getElementById('gen-race').value = 'avian';
            document.getElementById('gen-grade').value = grade;

            if (grade === 'C' || grade === 'UC') {
                document.getElementById('gen-style').value = 'style_classic'; if(document.getElementById('gen-body-type')) document.getElementById('gen-body-type').value = 'auto';
                document.getElementById('gen-role').value = 'ranger';
                document.getElementById('gen-details').value = 'small white feathered wings, sky blue bob hair, sky blue eyes, mini flare tunic';
            } else if (grade === 'R') {
                document.getElementById('gen-style').value = 'style_b';
                document.getElementById('gen-role').value = 'ranger';
                document.getElementById('gen-details').value = 'medium white feathered wings, white ponytail, side slit silk tunic, garter strap';
            } else if (grade === 'SR') {
                document.getElementById('gen-style').value = 'style_b';
                document.getElementById('gen-role').value = 'mage';
                document.getElementById('gen-details').value = 'large black fallen angel wings, raven twintails, sheer black chiffon dress, garter belt';
            } else if (grade === 'UR') {
                document.getElementById('gen-style').value = 'supreme_gold_chain';
                document.getElementById('gen-role').value = 'guardian';
                document.getElementById('gen-details').value = 'six radiant gold angel wings, golden blonde hair, feather chain bikini armor, silk veil';
            } else if (grade === 'U') {
                document.getElementById('gen-style').value = 'supreme_celestial_lingerie';
                document.getElementById('gen-role').value = 'mage';
                document.getElementById('gen-details').value = 'twelve prismatic aurora wings, cosmic pastel hair, micro stardust slingshot lingerie, body chains';
            }

            updatePrompt();
            document.querySelector('.prompt-output-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        function applyHumanGradePreset(grade, btnEl) {
            if (document.getElementById('gen-body-type')) document.getElementById('gen-body-type').value = 'auto';
            // 버튼 액티브 클래스 갱신
            document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
            if (btnEl) {
                btnEl.classList.add('active');
            } else {
                const targetBtn = document.getElementById('preset-btn-human-' + grade);
                if (targetBtn) targetBtn.classList.add('active');
            }

            currentActiveHumanPreset = grade;
            document.getElementById('gen-race').value = 'human';
            document.getElementById('gen-grade').value = grade;

            if (grade === 'C' || grade === 'UC') {
                document.getElementById('gen-style').value = 'style_classic'; if(document.getElementById('gen-body-type')) document.getElementById('gen-body-type').value = 'auto';
                document.getElementById('gen-role').value = 'guardian';
                document.getElementById('gen-details').value = 'chestnut brown hair, warm brown eyes, imperial apprentice tunic, silver breastplate';
            } else if (grade === 'R') {
                document.getElementById('gen-style').value = 'style_a';
                document.getElementById('gen-role').value = 'guardian';
                document.getElementById('gen-details').value = 'blonde ponytail, sapphire eyes, imperial officer coat, square neckline cleavage, thigh holster';
            } else if (grade === 'SR') {
                document.getElementById('gen-style').value = 'style_hybrid';
                document.getElementById('gen-role').value = 'guardian';
                document.getElementById('gen-details').value = 'raven wavy hair, ruby eyes, black latex bodysuit under high-slit burgundy coat, diamond keyhole, garter belt';
            } else if (grade === 'UR') {
                document.getElementById('gen-style').value = 'supreme_gold_chain';
                document.getElementById('gen-role').value = 'guardian';
                document.getElementById('gen-details').value = 'golden blonde hair, tiara crown, gold and platinum chain bikini paladin armor, sheer white cape';
            } else if (grade === 'U') {
                document.getElementById('gen-style').value = 'supreme_celestial_lingerie';
                document.getElementById('gen-role').value = 'mage';
                document.getElementById('gen-details').value = 'cosmic pastel hair, golden starlight eyes, pure white sacred starlight slingshot lingerie, star compass halo';
            }

            updatePrompt();
            document.querySelector('.prompt-output-box').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        function applyCleanWhiteBackground(rawPrompt) {
            const bgPatterns = [
                /standing on stone floor/gi,
                /standing on grassy plain ground/gi,
                /standing on mossy stone ground in sunlit forest/gi,
                /standing on stone fortress courtyard/gi,
                /stone fortress dungeon background[^,]*/gi,
                /ancient temple throne background[^,]*/gi,
                /ancient sacred grove sanctuary background[^,]*/gi,
                /grand cloud sanctuary background[^,]*/gi,
                /grand cathedral sanctuary[^,]*/gi,
                /grand sanctuary background[^,]*/gi,
                /grand galaxy nebula background[^,]*/gi,
                /castle ramparts background[^,]*/gi,
                /misty ancient woodland background/gi,
                /blue sky cloud background/gi,
                /stardust nebula [^,]*background[^,]*/gi,
                /cosmic [^,]*nebula background/gi,
                /stardust nebula galaxy background[^,]*/gi,
                /flat simple gradient background/gi,
                /soft gradient studio background/gi,
                /floating slightly above cloudy ground/gi,
                /floating in mid-air levitation, grand galaxy[^,]*/gi,
                /with stardust and spatial distortion/gi
            ];
            let cleaned = rawPrompt;
            bgPatterns.forEach(pat => {
                cleaned = cleaned.replace(pat, "");
            });
            cleaned = cleaned.replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim();
            cleaned = cleaned.replace(/,\s*$/, "");
            cleaned += ", simple solid pure white background, clean plain white backdrop, no background elements, solo isolated character, full body asset cutout ready";
            return cleaned;
        }

        
        // 🎲 외모 및 세부 특징 랜덤 생성기 (헤어 컬러, 스타일, 눈동자, 표정, 종족별 포인트)
        function randomizeDetails() {
            const HAIR_COLORS = [
                'platinum blonde', 'silver white', 'radiant golden blonde', 'raven jet-black', 
                'soft rose pink', 'sakura pastel pink', 'misty ash blue', 'deep royal navy blue',
                'crimson ruby red', 'deep amethyst violet', 'emerald mint green', 'cosmic gradient pastel',
                'warm honey chestnut', 'lavender purple'
            ];

            const HAIR_STYLES = [
                'long flowing wavy hair', 'twin drill pigtails', 'high ponytail tied with ribbons',
                'neat bob cut', 'straight elegant hime-cut hair', 'twin braided pigtails',
                'loose messy side-braid', 'fluffy wavy twintails', 'voluminous wavy wolf cut',
                'half-up ribbon ponytail', 'medium layered hair with straight bangs', 'low twin tails'
            ];

            const EYE_SPECS = [
                'sharp violet eyes', 'sparkling sapphire blue eyes', 'glowing crimson ruby eyes',
                'warm golden amber eyes', 'mystic emerald green eyes', 'heterochromia (blue and golden) eyes',
                'deep amethyst slit eyes', 'gentle starlight cyan eyes', 'intense burning flame eyes',
                'translucent diamond eyes'
            ];

            const EXPRESSIONS = [
                'confident playful smile', 'gentle sweet smile', 'proud arrogant queen smirk',
                'cool composed calm expression', 'mischievous daring grin', 'shy blushing gaze',
                'dignified elegant smile', 'determined fierce battle expression', 'seductive charming smile'
            ];

            const RACE_ACCENTS = {
                'forest': ['long pointed elf ears', 'botanical flower hairpins', 'delicate emerald vine ornaments', 'emerald drop earrings'],
                'earth': ['steampunk brass goggles on head', 'rudimentary brass hairpin', 'cute grease smudge on cheek', 'leather headband with mini gear'],
                'beastkin': ['fluffy animal ears with tipped fur', 'cute canine fangs', 'expressive fluffy striped animal tail', 'leather feather choker'],
                'avian': ['delicate pure white feather hairpin', 'floating glowing starlight ribbons', 'crystal star hair clip', 'iridescent hair gradient'],
                'human': ['royal platinum hairpin', 'velvet lace hair ribbon', 'cross jewel brooch', 'golden pearl hair ornament'],
                'mutation': ['exotic gradient horns', 'mystic glowing rune tattoo on cheek', 'floating mana crystal shards']
            };

            const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

            const currentRace = document.getElementById('gen-race')?.value || 'human';
            const accents = RACE_ACCENTS[currentRace] || RACE_ACCENTS['human'];

            const color = pick(HAIR_COLORS);
            const style = pick(HAIR_STYLES);
            const eyes = pick(EYE_SPECS);
            const expr = pick(EXPRESSIONS);
            const accent = pick(accents);

            // 최종 랜덤 외모 조합
            const generatedDetails = `${color} ${style}, ${eyes}, ${expr}, ${accent}`;

            const inputEl = document.getElementById('gen-details');
            if (inputEl) {
                inputEl.value = generatedDetails;
                // 시각적 피드백 효과 (반짝임)
                inputEl.style.transition = 'background 0.3s';
                inputEl.style.background = 'rgba(99, 102, 241, 0.25)';
                setTimeout(() => {
                    inputEl.style.background = '';
                }, 300);
            }

            // 프롬프트 즉시 동기화
            updatePrompt();
        }

        function updatePrompt() {
            const grade = document.getElementById('gen-grade').value;
            const element = document.getElementById('gen-element').value;
            const role = document.getElementById('gen-role').value;
            const race = document.getElementById('gen-race').value;
            const style = document.getElementById('gen-style').value;
            const bodyType = document.getElementById('gen-body-type')?.value || 'auto';
            const details = document.getElementById('gen-details').value.trim();
            const isRemoveBg = document.getElementById('gen-remove-bg').checked;
            const genMode = document.querySelector('input[name="gen-mode"]:checked')?.value || 'illust';

            // 💃 체형 결정: 'auto'면 종족 기본 스펙, 선택 시 커스텀 체형 스펙 적용
            const selectedBodySpec = (bodyType !== 'auto' && BODY_TYPE_SPECS[bodyType]) 
                ? BODY_TYPE_SPECS[bodyType] 
                : (RACE_BODY_SPECS[race] || 'voluptuous adult female');

            let prompt = "";
            let negativePrompt = NEGATIVE_PROMPT_FIXED;

            if (genMode === 'sheet') {
                // 📐 캐릭터 설정 시트 (Model Sheet / Setting Guide) 모드
                const RACE_SHEET_SPECS = {
                    'earth': "earth folk, DUAL cybernetic mechanical prosthetic arms on BOTH left and right arms from shoulders to fingers with intricate brass gears and hydraulics, while both legs and torso are 100% natural organic skin",
                    'beastkin': "beastkin folk, fluffy animal ears on head and fluffy expressive animal tail, canine fangs",
                    'forest': "forest folk, long pointed elf ears, emerald eyes, ethereal nature aura",
                    'avian': "avian folk, majestic feathered wings spread on back, floating in air",
                    'human': "human folk, elegant imperial styling, versatile commander presence",
                    'mutation': "unique mutant anomaly, rare contrasting exotic hybrid features"
                };

                const GRADE_SHEET_SPECS = {
                    'C': "apprentice rank uniform, simple neat costume, training gear",
                    'UC': "junior officer uniform, formal cape, light armor",
                    'R': "formal knight officer uniform with side-slit and thigh holster snug strap squeeze",
                    'SR': "elite commander attire with seductive cutouts, leather body harness, garter belt and thigh-high boots, floating magic circle",
                    'UR': "apex imperial royal costume, ornate gold chain bikini armor, micro high-leg plating, sheer veil, holy halo",
                    'U': "transcendent cosmic goddess attire, micro slingshot lingerie, delicate diamond body chains, celestial halo"
                };

                // (RACE_BODY_SPECS moved to top)

                // 🩱 5대 종족 및 등급별 기본 내의(이너 레이어) 상세 명세 (AI 텍스트 안전 필터 우회 아트북 표준)
                const INNER_LAYER_SPECS = {
                    'earth': {
                        'C': "활동성 높은 그레이 스포츠 이너탑 & 로우라이즈 코튼 쇼츠 착용 (gray athletic stretch inner top and low-rise cotton undershorts)",
                        'UC': "활동성 높은 그레이 스포츠 이너탑 & 로우라이즈 코튼 쇼츠 착용 (gray athletic stretch inner top and low-rise cotton undershorts)",
                        'R': "블랙 통기성 메쉬 하프탑 & 심리스 보이쇼츠 착용 (black breathable mesh half-top and seamless boy-shorts under-suit)",
                        'SR': "바디슈트 안감 밀착용 블랙 새틴 스트랩 이너탑 & 하이레그 스트링 이너 쇼츠 착용 (black satin strappy minimal inner top and high-leg micro string undershorts under the catsuit)",
                        'UR': "황금 플레이트와 맞물리는 메탈릭 골드 스트링 이너탑 & 마이크로 사이드타이 이너 레이어 착용 (metallic gold string inner top and micro side-tie low-rise base layer)",
                        'U': "물리적 섬유 내의 미착용, 황금 나노 바디체인 부착 (No traditional fabric inner layer; form-fitting radiant holographic body-chains and golden circuit lines on bare skin)"
                    },
                    'beastkin': {
                        'C': "탄력적인 블랙 스포츠 이너탑 & 야성적인 신축성 쇼츠 착용 (elastic black athletic inner top and low-waist flexible stretch undershorts)",
                        'UC': "탄력적인 블랙 스포츠 이너탑 & 야성적인 신축성 쇼츠 착용 (elastic black athletic inner top and low-waist flexible stretch undershorts)",
                        'R': "타이트한 레더 룩 스트랩 이너탑 & 하이웨이스트 심리스 압박 쇼츠 착용 (tight leatherette strappy top and high-waist seamless compression undershorts)",
                        'SR': "키홀 컷아웃 전용 오픈 가슴 레이스 이너탑 & 골반 컷아웃 하이레그 스트링 이너 착용 (plunging open-bust lace bralette top and pelvic cutout high-leg undershorts)",
                        'UR': "호피 퍼 트림 골드 마이크로 탑 & 하이레그 스트링 이너 레이어 착용 (leopard-fur trimmed gold micro top and ultra high-leg string base layer)",
                        'U': "물리적 섬유 내의 미착용, 신수 오로라 바디체인 부착 (No traditional fabric inner layer; bare skin adorned only with beast-god aurora body-chains and divine 9-tail aura)"
                    },
                    'forest': {
                        'C': "정갈한 순백 리넨 레이스업 소프트 탑 & 로우컷 리넨 쇼츠 착용 (pure white linen lace-up soft top and comfortable low-cut linen undershorts)",
                        'UC': "정갈한 순백 리넨 레이스업 소프트 탑 & 로우컷 리넨 쇼츠 착용 (pure white linen lace-up soft top and comfortable low-cut linen undershorts)",
                        'R': "에메랄드빛 실크 하프컵 이너탑 & 누드톤 심리스 사이드 스트링 이너 착용 (emerald sheer silk half-cup top and seamless nude-tone side-string undershorts)",
                        'SR': "딥 그린 시스루 플로럴 레이스 이너탑 & 레이스 하이레그 이너 쇼츠 착용 (deep emerald sheer floral lace bralette top and matching lace high-leg undershorts with garter straps)",
                        'UR': "황금 나뭇잎 컵 비키니 탑 & 시스루 마이크로 에메랄드 사이드타이 스트링 이너 착용 (ornate gold leaf-cup top and sheer micro emerald side-tie string base layer)",
                        'U': "물리적 섬유 내의 미착용, 에메랄드 이슬 바디체인 부착 (No traditional fabric inner layer; bare skin adorned only with botanical vine jewels and emerald dewdrop body-chains)"
                    },
                    'avian': {
                        'C': "하늘빛 코튼 소프트 이너탑 & 프릴 레이스 파스텔 쇼츠 착용 (sky-blue soft cotton top and ruffled edge pastel lace undershorts)",
                        'UC': "하늘빛 코튼 소프트 이너탑 & 프릴 레이스 파스텔 쇼츠 착용 (sky-blue soft cotton top and ruffled edge pastel lace undershorts)",
                        'R': "순백 실크 리본 이너탑 & 골반 트임 레이스 사이드타이 이너 착용 (pure white silk ribbon top and high-slit lace side-tie undershorts)",
                        'SR': "고혹적인 블랙 쉬폰 플런징 이너탑 & 시스루 레이스 가터 루프 이너 착용 (seductive black sheer chiffon plunging top and sheer lace garter-loop base layer)",
                        'UR': "순금 깃털 양각 마이크로 이너탑 & 초소형 골드 체인 스트링 이너 착용 (sculpted gold feather micro top and ultra-minimal gold chain base layer)",
                        'U': "물리적 섬유 내의 미착용, 성운 다이아몬드 바디체인 부착 (No traditional fabric inner layer; bare skin adorned only with starlight diamond body-chains and glowing feather light ribbons)"
                    },
                    'human': {
                        'C': "단정한 제국 네이비/화이트 규정 면 스포츠 이너탑 & 활동성 복서 쇼츠 착용 (neat imperial navy/white athletic regulation cotton top and flexible boxer undershorts)",
                        'UC': "단정한 제국 네이비/화이트 규정 면 스포츠 이너탑 & 활동성 복서 쇼츠 착용 (neat imperial navy/white athletic regulation cotton top and flexible boxer undershorts)",
                        'R': "가슴골 모아주는 블랙 푸시업 이너탑 & 심리스 로우라이즈 보이쇼츠 착용 (black push-up cleavage top and low-rise seamless boy-shorts undershorts under leather shorts)",
                        'SR': "키홀 컷아웃 전용 누디 코르셋 탑 & 가터벨트 일체형 하이레그 레이스 이너 착용 (plunging keyhole nude-cut corset top and high-leg lace garter-belt base layer)",
                        'UR': "정교한 백금 흉갑형 마이크로 탑 & 골반 90% 개방 골드 스트링 플레이트 이너 착용 (ornate platinum sculpted micro top and 90% open pelvic gold chain micro base layer)",
                        'U': "물리적 섬유 내의 미착용, 순백 성광 스타더스트 바디체인 부착 (No traditional fabric inner layer; bare skin adorned only with stardust diamond body-chains and holy light halos)"
                    }
                };

                // 🏷️ 종족별 표준 복장 분해도 라벨 명세 (09~14번 가변, 15번 공통 속옷)
                const RACE_COSTUME_LABELS = {
                    'earth': {
                        'head': '09. 복장 : 고글 / 헤어핀',
                        'top': '10. 복장 : 상의 (작업형 흉갑 상의)',
                        'bottom': '11. 복장 : 하의 (카고 배틀 하의)',
                        'outer': '12. 복장 : 외투 (엔지니어 망토 / 코트)',
                        'acc1': '13. 장신구 1 (레더 하네스 & 공구 벨트)',
                        'acc2': '14. 장신구 2 (강철 엔지니어 부츠)'
                    },
                    'beastkin': {
                        'head': '09. 복장 : 머리 장식 (야성 헤어핀 / 깃털 리본)',
                        'top': '10. 복장 : 상의 (가죽 크롭 상의)',
                        'bottom': '11. 복장 : 하의 (배틀 레더 하의)',
                        'outer': '12. 복장 : 외투 (털 망토 / 판초 / 케이프)',
                        'acc1': '13. 장신구 1 (가죽 바디 스트랩)',
                        'acc2': '14. 장신구 2 (발톱 각반 및 부츠)'
                    },
                    'forest': {
                        'head': '09. 복장 : 잎새 티아라 / 헤어핀',
                        'top': '10. 복장 : 상의 (실크 로브 상의)',
                        'bottom': '11. 복장 : 하의 (시스루 슬릿 하의)',
                        'outer': '12. 복장 : 외투 (오르간자 페어리 실크 망토)',
                        'acc1': '13. 장신구 1 (에메랄드 바디체인)',
                        'acc2': '14. 장신구 2 (덩굴 발찌 및 샌들)'
                    },
                    'avian': {
                        'head': '09. 복장 : 성간 나침반 헤일로',
                        'top': '10. 복장 : 상의 (신성 상의)',
                        'bottom': '11. 복장 : 하의 (신성 하의)',
                        'outer': '12. 복장 : 결정체 오로라 날개',
                        'acc1': '13. 장신구 1 (황금 바디체인)',
                        'acc2': '14. 장신구 2 (반투명 리본 및 발목 넝쿨)'
                    },
                    'human': {
                        'head': '09. 복장 : 제국 장교모 / 티아라',
                        'top': '10. 복장 : 상의 (제국 기사 흉갑 상의)',
                        'bottom': '11. 복장 : 하의 (제국 제복 스커트 하의)',
                        'outer': '12. 복장 : 의전용 비단 망토',
                        'acc1': '13. 장신구 1 (홀스터 레더 하네스)',
                        'acc2': '14. 장신구 2 (기사단 플레이트 부츠)'
                    }
                };

                const currentCostumeLabels = RACE_COSTUME_LABELS[race] || {
                    'head': '09. 복장 : 머리 장식 / 헤일로 / 티아라',
                    'top': '10. 복장 : 상의 (흉갑 / 상의)',
                    'bottom': '11. 복장 : 하의 (스커트 / 하의 아머)',
                    'outer': '12. 복장 : 외투 / 날개 / 망토',
                    'acc1': '13. 장신구 1 (바디체인 / 하네스 / 벨트)',
                    'acc2': '14. 장신구 2 (부츠 / 각반 / 발찌)'
                };

                const currentInnerLayer = (INNER_LAYER_SPECS[race] && INNER_LAYER_SPECS[race][grade]) 
                    ? INNER_LAYER_SPECS[race][grade] 
                    : "appropriate stylized inner base layer matching the costume grade (fitted top and undershorts)";

                // ✨ 실전 골든 프롬프트 분석 기반 기본 체형(04) 묘사:
                // 점토 마네킹 대신 동일 얼굴/헤어 + 스킨톤 반투명 세컨드스킨 바디슈트로 인체 볼륨과 빛 반사를 유지하며 안전 필터 완벽 회피
                                // 🧬 5대 종족 고유 신체 특징 명세 (04 기본 체형에도 탈의되지 않고 원본과 100% 동일한 사지 구성 유지)
                const RACE_ANATOMICAL_FEATURES = {
                    'earth': "Permanent mechanical prosthetic limbs: BOTH arms (left arm and right arm simultaneously) MUST be mechanical cybernetic prosthetic arms with visible brass gears, mechanical joints, and pneumatic cylinders from shoulders to fingers. Her torso and BOTH legs MUST be 100% natural organic human skin (NEVER turn legs into robotic legs, NEVER depict one arm as organic flesh when the character has dual robotic arms). Mechanical arms are living body parts and must NEVER appear detached in views 09-15.",
                    'beastkin': "Permanent beast anatomy: Her fluffy animal ears on head and natural expressive animal tail are living, permanent body parts rooted in her flesh. Both animal ears and tail MUST remain attached on views 01-04 (tail and ears must NEVER be depicted as detached costume props in views 09-15, and must NEVER be replaced by human ears or four-ears).",
                    'forest': "Permanent elf anatomy: Her long pointed crystal/emerald elf ears are living body parts and MUST remain attached on views 01-04 (NEVER turn elf ears into short human round ears on 04 base body, ears must never appear detached in views 09-15).",
                    'avian': "Permanent avian anatomy: Natural feathered wings on her back are living, permanent body parts and MUST BE FULLY SPREAD AND ATTACHED on views 01-04 (wings must NEVER be detached into costume breakdown, and must NEVER be stripped from 04 base body).",
                    'human': "Pure natural human anatomy with natural organic limbs and smooth skin on views 01-04 (NO animal ears, NO elf ears, NO wings, NO robotic limbs).",
                    'mutation': "Exotic permanent mutant anatomical traits strictly mirroring original image."
                };

                // ✨ 최초 레퍼런스 시트 표준: 04 기본 체형 (사지 구성 1:1 복제 + 순수 스킨톤 베이스 + 완전한 얼굴/헤어)
                const baseBodyPrompt = `full-body anatomical base character model of the EXACT SAME character (NOT a blank mannequin, NOT a featureless doll, NOT a faceless silhouette, NOT a bald mannequin):
- Identical Face & Hair (완전한 얼굴과 헤어스타일): MUST have her complete beautiful expressive anime face (clear eyes, eyelashes, eyebrows, nose, mouth) and full voluminous hairstyle and hair color IDENTICAL to turnaround views 01-03.
- Inherent Bodily Traits (종족 고유 신체 100% 보존): ${RACE_ANATOMICAL_FEATURES[race] || ''}
- Equipment Stripping (순수 복장/장비만 탈의): Stripped of fabric clothing, outer armor, cape, halo, weapons, and accessories only. Her biological skin and permanent anatomical parts (earth folk's mechanical arms, beastkin's ears & tail, avian folk's wings, forest folk's elf ears) remain fully attached to her body. Permanent anatomical features are living body parts and must NEVER appear as detached spare parts in the costume breakdown (views 09-15).
- Body & Proportions: Natural bare female anatomy strictly maintaining her specified build (${selectedBodySpec}) for 3D modeling and rigging reference, seamless smooth natural skin tone with soft studio rim lighting highlighting body silhouette and muscle contours, non-sexual safe-for-work production reference (NO dark bodysuit, NO black tank top, skin-toned smooth seamless surface).
- Korean Label: '04. 기본 체형'`;

                prompt = `Based on the attached character design image, generate a professional game production character reference sheet (official model sheet & setting guide), multiple turnaround angles of the exact same character: full body front view, full body side view, full body back view.
[1. Standard Numbered Korean Annotations]: All section titles, part labels, callouts, and explanatory notes on the sheet MUST be written in Korean text with precise numbered tags for seamless post-production text editing:
- Main Turnaround & Base: '01. 정면', '02. 측면', '03. 후면', '04. 기본 체형'
- Expression Sheet: '05. 기본 무표정', '06. 밝은 미소', '07. 자신감', '08. 진지한 결의'
- Exploded Costume & Accessories (Isolated at the end):
  '${currentCostumeLabels.head}',
  '${currentCostumeLabels.top}',
  '${currentCostumeLabels.bottom}',
  '${currentCostumeLabels.outer}',
  '${currentCostumeLabels.acc1}',
  '${currentCostumeLabels.acc2}',
  '15. 복장 : 속옷 (속옷 상의, 속옷 하의)'
[2. Character Natural Base Body Model ('04. 기본 체형')]: ${baseBodyPrompt}.
[3. Exploded Costume Breakdown (복장 분해도: 09~14)]: isolated equipment display showing: headpiece (${currentCostumeLabels.head}), upper outerwear/armor (${currentCostumeLabels.top}), lower outerwear/skirt (${currentCostumeLabels.bottom}), back accessory/cape/wings (${currentCostumeLabels.outer}), accessory 1 (${currentCostumeLabels.acc1}), accessory 2 (${currentCostumeLabels.acc2}).
[3-1. Specific Underwear Breakdown ('15. 복장 : 속옷 - 속옷 상의, 속옷 하의')]: Detailed isolated breakdown of the inner foundation layer: [Underwear Spec: ${currentInnerLayer}]. Clearly illustrate both the isolated fitted undergarment top (속옷 상의) and matching undershorts (속옷 하의) as distinct individual clothing items labeled in Korean as '15. 복장 : 속옷 (속옷 상의, 속옷 하의)'. If specified as 'No traditional fabric inner layer', explicitly depict her body wearing no fabric inner layer with only the sacred radiant body-chains or glowing aura on bare skin, labeled in Korean as '15. 복장 : 속옷 (신성 바디체인)'.
[4. Facial Expression Sheet (표정 시트: 05~08)]: 4 distinct facial expression portraits labeled in Korean ('05. 기본 무표정', '06. 밝은 미소', '07. 자신감', '08. 진지한 결의').
[5. Safety & Production Context]: Strictly non-sexual, professional concept art bible for 3D game modeling, animation rigging, and costume tailoring reference, clean precise lineart, safe for work, character production study, simple solid pure white background, no cut off, entire body visible from head to toe, master quality anime illustration, ${RACE_SHEET_SPECS[race] || 'female anime commander'}, ${selectedBodySpec}, ${STYLE_PROMPTS[style] || 'stylish costume'}, ${details ? details + ', ' : ''}${ROLE_PROMPTS[role] || ''}, ${ELEMENT_PROMPTS[element] || ''}`;
                
                // 🛡️ 실전 검증된 설정 시트 전용 올인원 네거티브 프롬프트 (체형 맞춤형 분기)
                let sheetBodyNegatives = [];
                if (bodyType === 'slender' || bodyType === 'petite') {
                    sheetBodyNegatives.push("huge breasts, large breasts, heavy cleavage, voluptuous, thick thighs, wide hips, plump");
                } else if (bodyType === 'mega_glamour') {
                    sheetBodyNegatives.push("flat chest, small breasts, skinny, slender, modest bust");
                } else if (bodyType === 'standard') {
                    sheetBodyNegatives.push("huge breasts, gigantic breasts, flat chest, extreme curves");
                }

                const baseSheetNegative = "detached animal tail in costume breakdown, animal ears headband in costume section, missing tail on 04 base body, missing animal ears on 04 base body, four ears on beastkin, human ears on beastkin, missing elf ears on forest folk, short round ears on forest folk, detached elf ears in costume breakdown, missing wings on avian folk, detached feathered wings in costume breakdown, prosthetic leg replacing organic leg, converting organic legs into robotic legs, cybernetic leg when original has human legs, single robotic arm when original has dual robotic arms, one organic arm when both arms are mechanical, normal flesh arm on mechanical arm side, human arm replacing mechanical arm, asymmetric flesh arm, one robotic arm and one flesh arm, detached mechanical arm in costume breakdown, mechanical limbs in exploded costume section, black bodysuit on 04 base body, dark leotard on 04 base body, dark swimsuit on 04 base body, ball-jointed doll, joint doll, doll joints, featureless head, bald, faceless, blank face, no eyes, mannequin, wooden mannequin, plastic doll, organic arm replacing prosthetic arm on earth folk, missing mechanical arm, clothes on 04 base body, wings on 04 base body, halo on 04 base body, armor on 04 base body, underwear on 04 base body, different hairstyle on 04 base body, short hair on 04 base body, different face, different character, changed body type, altered proportions, nsfw, explicit, erotic, sexual, inconsistent costume, english text labels, english words, chinese characters, japanese text, cropped, out of frame, cut off head, cut off feet, complex background, scenery, landscape, blurry, lowres, bad anatomy, bad hands, extra limbs, extra arms, extra legs, cropped, out of frame, cut off head, cut off feet, cut off legs, cut off shoes, close-up, portrait, bust shot, upper body only, medium shot, zoom in, extra arms, extra legs, extra limbs, third arm, four arms, mutated hands, poorly drawn hands, missing limbs, fused limbs, malformed limbs, cloned limbs, floating limbs, extra fingers, deformed fingers, fused fingers, child, kid, underage, loli, male, man, boy, text, error, missing fingers, extra digit, fewer digits, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry";

                negativePrompt = sheetBodyNegatives.concat([baseSheetNegative]).join(", ");

                // UI 안내 문구 업데이트
                document.getElementById('copy-bar-title').innerHTML = `<span>📐 나노바나나 설정 시트 (01~15번 표준 넘버링·속옷 분해도) 복사</span><span id="copy-bar-badge" style="background: #f59e0b; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">MODEL SHEET</span>`;
                document.getElementById('copy-bar-desc').textContent = `📌 [01~15 표준 넘버링 적용] 01~04 턴어라운드 및 체형 / 05~08 표정 / 09~14 복장·장신구 / 15. 복장 : 속옷(속옷 상의, 속옷 하의) 분해도가 후가공 최적화 규격으로 안전하게 생성됩니다.`;
                document.getElementById('btn-main-copy').textContent = "📐 설정 시트 전용 복사 (01~15 넘버링)";
                document.getElementById('btn-main-copy').style.background = "linear-gradient(135deg, #f59e0b, #ec4899)";

            } else {
                // ✨ 전신 일러스트 모드: 사용자가 선택한 [체형 + 복장 + 역할군 + 속성 + 등급 + 종족 + 세부특징] 완전 동적 결합 엔진
                const baseMaster = "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, anatomically correct, clean lineart, vibrant cel-shading, cinematic lighting";
                
                // 1. 선택된 체형 주입 (슬랜더, 표준, 글래머, 메가 글래머, 톰보이, 로리/쁘띠 또는 종족 자동)
                const bodyClause = selectedBodySpec;
                
                // 2. 선택된 의상 스타일 주입
                const styleClause = STYLE_PROMPTS[style] || "stylish fantasy costume";
                
                // 3. 종족 고유 외형
                const raceClause = RACE_PROMPTS[race] || "human folk";
                
                // 4. 역할군 & 무기/장비
                const roleClause = ROLE_PROMPTS[role] || "";
                
                // 5. 원소 속성 이펙트
                const elementClause = ELEMENT_PROMPTS[element] || "";
                
                // 6. 등급 아우라 및 배경 연출
                const gradeClause = GRADE_PROMPTS[grade] || "";
                
                // 7. 세부 외모 (헤어, 눈, 표정, 장신구)
                const detailClause = details ? details : "";

                // 동적 결합
                const promptParts = [
                    baseMaster,
                    bodyClause,
                    styleClause,
                    raceClause,
                    detailClause,
                    roleClause,
                    elementClause,
                    gradeClause
                ].filter(p => p && p.trim().length > 0);

                prompt = promptParts.join(", ");

                // 🛡️ 체형 및 종족별 지능형 네거티브 프롬프트 결합
                let customNegatives = [];

                // 체형별 상반되는 키워드 자동 배제
                if (bodyType === 'slender') {
                    customNegatives.push("huge breasts, large breasts, heavy cleavage, voluptuous, thick thighs, wide hips, plump");
                } else if (bodyType === 'petite') {
                    customNegatives.push("tall, mature adult woman, huge breasts, long legs, heavy curves, voluptuous");
                } else if (bodyType === 'standard') {
                    customNegatives.push("huge breasts, gigantic breasts, flat chest, extreme curves");
                } else if (bodyType === 'mega_glamour') {
                    customNegatives.push("flat chest, small breasts, skinny, slender, modest bust");
                } else if (bodyType === 'tomboy') {
                    customNegatives.push("ultra feminine, soft fat, weak physique, heavy makeup");
                }

                // 종족별 비정상 파츠 배제 (U등급 천상 날개와의 상호 충돌 지능형 방지)
                if (race === 'human') {
                    const humanNeg = ["animal ears", "four ears", "elf ears", "pointed ears", "cyborg arm", "mechanical parts"];
                    if (grade !== 'U') humanNeg.push("wings");
                    customNegatives.push(humanNeg.join(", "));
                } else if (race === 'beastkin') {
                    const beastNeg = ["human ears", "four ears", "extra ears", "missing animal ears", "missing tail"];
                    if (grade !== 'U') beastNeg.push("wings");
                    customNegatives.push(beastNeg.join(", "));
                } else if (race === 'forest') {
                    const forestNeg = ["short ears", "round human ears", "animal ears"];
                    if (grade !== 'U') forestNeg.push("wings");
                    customNegatives.push(forestNeg.join(", "));
                } else if (race === 'avian') {
                    customNegatives.push("no wings, missing wings, animal ears, elf ears");
                } else if (race === 'earth') {
                    const earthNeg = ["animal ears", "elf ears"];
                    if (grade !== 'U') earthNeg.push("wings");
                    customNegatives.push(earthNeg.join(", "));
                }

                if (style === 'supreme_celestial_lingerie') {
                    customNegatives.push("bodysuit, catsuit, jumpsuit, full body suit, tights, leggings, heavy armor, plate armor, heavy coat, heavy dress, robe, hat");
                } else if (style === 'supreme_cyber_highleg' || style === 'style_a') {
                    customNegatives.push("loose robe, wedding dress, fluffy gown, lingerie, negligee, casual clothes");
                }

                negativePrompt = customNegatives.concat([NEGATIVE_PROMPT_FIXED]).join(", ");

                // 배경 제거 모드 활성화 시 배경 교체
                if (isRemoveBg) {
                    prompt = applyCleanWhiteBackground(prompt);
                    negativePrompt = "scenery, landscape, complex background, outdoors, indoors, furniture, sky, clouds, space, nebula, stars, shadows on background, gradient background, " + negativePrompt;
                    
                    document.getElementById('copy-bar-title').innerHTML = `<span>🍌 나노바나나 에셋 누끼용(순백 배경) 원클릭 복사</span><span id="copy-bar-badge" style="background: #38bdf8; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">WHITE BG CUTOUT</span>`;
                    document.getElementById('copy-bar-desc').textContent = "순백 단색 배경으로 캐릭터만 분리 출력되어 그래픽 툴에서 1초 만에 투명 PNG 누끼를 딸 수 있습니다.";
                    document.getElementById('btn-main-copy').textContent = "⬜ 에셋 누끼용 통합 복사";
                    document.getElementById('btn-main-copy').style.background = "linear-gradient(135deg, #0284c7, #6366f1)";
                } else {
                    document.getElementById('copy-bar-title').innerHTML = `<span>🍌 나노바나나 / 제미나이(단일창) 전용 원클릭 복사</span><span id="copy-bar-badge" style="background: #eab308; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">FULL BODY 보장</span>`;
                    document.getElementById('copy-bar-desc').textContent = "머리부터 발끝까지 잘리지 않는 전신 샷 키워드와 인체 기형 배제 지시문이 단일 문장으로 자동 결합됩니다.";
                    document.getElementById('btn-main-copy').textContent = "🚀 나노바나나 전용 통합 복사";
                    document.getElementById('btn-main-copy').style.background = "linear-gradient(135deg, #f59e0b, #6366f1)";
                }
            }

            document.getElementById('prompt-output').textContent = prompt;
            document.getElementById('prompt-output-negative').textContent = negativePrompt;
        }

        function copyPrompt(type) {
            let text = "";
            let message = "";
            const pos = document.getElementById('prompt-output').textContent;
            const neg = document.getElementById('prompt-output-negative').textContent;
            const genMode = document.querySelector('input[name="gen-mode"]:checked')?.value || 'illust';
            const isRemoveBg = document.getElementById('gen-remove-bg').checked;

            if (type === 'positive') {
                text = pos;
                message = "✅ 포지티브 프롬프트가 복사되었습니다!";
            } else if (type === 'negative') {
                text = neg;
                message = "✅ 인체 오류/잘림 방지 네거티브 프롬프트가 복사되었습니다!";
            } else if (type === 'all_in_one') {
                text = `${pos}. Avoid: ${neg}`;
                if (genMode === 'sheet') {
                    message = "📐 [캐릭터 설정 시트 모드] 복사 완료!\n\n📌 안내: 나노바나나(제미나이)에 '캐릭터 원본 이미지'를 먼저 첨부(Ctrl+V)하고 이 프롬프트를 함께 붙여넣어 전송하세요!";
                } else if (isRemoveBg) {
                    message = "⬜ [에셋 누끼/순백 배경 모드] 복사 완료!\n\n나노바나나 입력창에 그대로 붙여넣기(Ctrl+V) 하시면 단색 순백 배경으로 캐릭터가 단독 출력됩니다.";
                } else {
                    message = "🍌 나노바나나 전용 검증 프롬프트가 100% 동일하게 복사되었습니다!\n나노바나나 입력창에 그대로 붙여넣기(Ctrl+V) 하세요.";
                }
            }

            navigator.clipboard.writeText(text).then(() => {
                alert(message);
            });
        }

        // 초기 생성
        updatePrompt();
    

function runSimulation(state) {
  currentMockState = {
    'gen-grade': state.grade,
    'gen-element': state.element,
    'gen-role': state.role,
    'gen-race': state.race,
    'gen-style': state.style,
    'gen-body-type': state.bodyType,
    'gen-details': '',
    'gen-remove-bg': state.removeBg,
    'gen-mode': state.mode
  };
  
  // prompt-output 채우기 모의
  let posText = "";
  let negText = "";
  
  const originalGetElementById = document.getElementById;
  document.getElementById = (id) => {
    const el = originalGetElementById(id);
    if (id === 'prompt-output') {
      return {
        set textContent(v) { posText = v; },
        get textContent() { return posText; }
      };
    }
    if (id === 'prompt-output-negative') {
      return {
        set textContent(v) { negText = v; },
        get textContent() { return negText; }
      };
    }
    return el;
  };

  updatePrompt();
  return { pos: posText, neg: negText };
}

module.exports = { runSimulation };