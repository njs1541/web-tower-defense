// 자동 생성 파일: node scratch/build_pixel_fx.mjs 가 만든다. 직접 고치지 말고 스크립트의 EFFECTS를 고친 뒤 다시 실행한다.
// 원본: patch-gg/pixelfx (MIT, scratch/pixelfx/LICENSE). w/h는 한 프레임 크기, px/py는 프레임 안 기준점(타격점 또는 바닥).
const PIXEL_FX_SHEETS = {
    hit_ranged: {"src":"assets/fx/hit_ranged.png","w":111,"h":67,"frames":9,"fps":20,"px":27,"py":55,"anchor":"center","from":"impacts/hit-spark","bytes":9485},
    hit_melee: {"src":"assets/fx/hit_melee.png","w":87,"h":72,"frames":12,"fps":20,"px":47,"py":59,"anchor":"center","from":"impacts/blunt-hit","bytes":33790},
    hit_sniper: {"src":"assets/fx/hit_sniper.png","w":108,"h":62,"frames":14,"fps":20,"px":81,"py":55,"anchor":"center","from":"impacts/bullet-impact","bytes":16521},
    hit_ice: {"src":"assets/fx/hit_ice.png","w":102,"h":104,"frames":18,"fps":20,"px":51,"py":99,"anchor":"ground","from":"ice/snowflake-burst","bytes":77417},
    hit_shock: {"src":"assets/fx/hit_shock.png","w":115,"h":82,"frames":14,"fps":20,"px":74,"py":41,"anchor":"center","from":"lightning/zap-hit","bytes":42563},
    hit_crit: {"src":"assets/fx/hit_crit.png","w":162,"h":118,"frames":14,"fps":20,"px":66,"py":91,"anchor":"center","from":"impacts/crit-hit","bytes":66419},
    hit_hero_u: {"src":"assets/fx/hit_hero_u.png","w":111,"h":67,"frames":9,"fps":20,"px":27,"py":55,"anchor":"center","from":"impacts/hit-spark","bytes":9037},
    explosion: {"src":"assets/fx/explosion.png","w":191,"h":158,"frames":12,"fps":12,"px":98,"py":116,"anchor":"ground","from":"explosions/small-explosion","bytes":120604},
    implosion: {"src":"assets/fx/implosion.png","w":165,"h":165,"frames":19,"fps":12,"px":86,"py":86,"anchor":"center","from":"explosions/implosion","bytes":129254},
    death: {"src":"assets/fx/death.png","w":82,"h":72,"frames":10,"fps":12,"px":37,"py":62,"anchor":"ground","from":"spawn/poof","bytes":22118},
    boss_death: {"src":"assets/fx/boss_death.png","w":284,"h":202,"frames":17,"fps":12,"px":147,"py":175,"anchor":"ground","from":"explosions/big-explosion","bytes":474744},
    spell_thunder: {"src":"assets/fx/spell_thunder.png","w":223,"h":259,"frames":15,"fps":12,"px":111,"py":226,"anchor":"ground","from":"lightning/lightning-strike","bytes":228697},
    spell_meteor: {"src":"assets/fx/spell_meteor.png","w":254,"h":200,"frames":19,"fps":12,"px":145,"py":177,"anchor":"ground","from":"fire/meteor","bytes":232179},
    spell_tornado: {"src":"assets/fx/spell_tornado.png","w":143,"h":158,"frames":23,"fps":12,"px":76,"py":149,"anchor":"ground","from":"nature/tornado","bytes":223250},
    spell_warp: {"src":"assets/fx/spell_warp.png","w":159,"h":142,"frames":14,"fps":12,"px":83,"py":118,"anchor":"ground","from":"arcane/mana-burst","bytes":112097},
    spell_bless: {"src":"assets/fx/spell_bless.png","w":131,"h":117,"frames":17,"fps":12,"px":60,"py":47,"anchor":"center","from":"holy/feather-burst","bytes":101140},
    spell_gold: {"src":"assets/fx/spell_gold.png","w":73,"h":83,"frames":13,"fps":12,"px":34,"py":78,"anchor":"center","from":"pickups/collect-burst","bytes":21533},
};
