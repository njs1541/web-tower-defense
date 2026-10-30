const fs = require('fs');
let code = fs.readFileSync('js/constants.js', 'utf8');

const sylvanaCommander = `    char_sylvana: {
        id: "char_sylvana",
        name: "실바나",
        title: "성역의 여황 (신록의 성소)",
        grade: "UR",
        element: "nature",
        role: "guardian",
        avatar: "👑",
        image: "assets/char_sylvana.jpg",
        maxSockets: 6,
        baseSockets: 4,
        isHeroUnit: true,
        heroType: "hero",
        levelCaps: {
            ranged: 2,
            ice: 2,
            shock: 2,
            sniper: 2,
            melee: 2
        },
        towerStock: {},
        refundRate: 0.7,
        quotes: [
            "신록의 성역에 발을 들이는 자, 세계수의 위대한 가호를 받으리라.",
            "나의 성벽 같은 대방패가 모든 침략자로부터 그대를 지켜낼 것입니다.",
            "성역을 더럽히는 적들에게 자연의 단죄를 내리겠습니다."
        ],
        skillQuote: "성역의 방벽이여 전개하라! 에메랄드 생츄어리!",
        desc: "숲의 종족 성역을 다스리는 초월적 여황. 메가 글래머 체형과 화려한 황금 잎사귀 갑주, 신목의 대방패로 3x3 범위 내 아군 타워에 난공불락의 자연 방벽과 생명력 버프를 부여합니다."
    }`;

const sylvanaModular = `    char_sylvana: {
        rigType: "tall", hairColor: "#fef08a", eyeColor: "#10b981",
        primaryColor: "#10b981", secondaryColor: "#f59e0b",
        backPart: "wings", headGear: "tiara", weaponType: "shield", weaponColor: "#10b981",
        standingIllust: "assets/char_sylvana.jpg",
        sheetA: "assets/ref_sylvana_sheet_a.jpg",
        sheetB: "assets/ref_sylvana_sheet_b.jpg",
        modularParts: {
            useBaseBody: true,
            mirrorWings: true,
            frontCore: "assets/parts/sylvana_front_core.png",
            baseBody: "assets/parts/sylvana_base_body.png",
            exprNeutral: "assets/parts/sylvana_expr_neutral.png",
            exprSerious: "assets/parts/sylvana_expr_serious.png",
            headgear: "assets/parts/sylvana_headgear.png",
            topDress: "assets/parts/sylvana_top_dress.png",
            bottomSkirt: "assets/parts/sylvana_bottom_skirt.png",
            bottomSkirtBack: "assets/parts/sylvana_bottom_skirt_back.png",
            wingsCape: "assets/parts/sylvana_wings_cape.png",
            mainWeapon: "assets/parts/sylvana_main_weapon.png",
            subWeapon: "assets/parts/sylvana_sub_weapon.png",
            underwear: null
        }
    }`;

// 1. Insert into COMMANDERS before '};'
code = code.replace(/(\n\s*desc:[^\n]*세계수 생명 오라[^\n]*\r?\n\s*\})([\r\n]+\s*\};)/, '$1,\n' + sylvanaCommander + '$2');

// 2. Insert into MODULAR_CHARACTER_SPECS before '};'
code = code.replace(/(\n\s*char_titania:\s*\{[\s\S]*?underwear:\s*null\s*\r?\n\s*\}\s*\r?\n\s*\})([\r\n]+\s*\};)/, '$1,\n' + sylvanaModular + '$2');

fs.writeFileSync('js/constants.js', code, 'utf8');
console.log('Successfully updated js/constants.js with char_sylvana!');

