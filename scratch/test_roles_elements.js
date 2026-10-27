const { runSimulation } = require('./sim_harness.js');

const races = ['earth', 'beastkin', 'forest', 'avian', 'human'];
const grades = ['C', 'UC', 'R', 'SR', 'UR', 'U'];
const bodyTypes = ['auto', 'slender', 'standard', 'glamour', 'mega_glamour', 'tomboy', 'petite'];
const styles = ['supreme_gold_chain', 'supreme_cyber_highleg', 'supreme_celestial_lingerie', 'style_a', 'style_b', 'style_hybrid', 'style_classic'];
const roles = ['warrior', 'tank', 'ranger', 'mage', 'assassin', 'support'];
const elements = ['physical', 'fire', 'frost', 'shock', 'holy', 'dark', 'wind', 'earth'];
const modes = ['illust', 'sheet'];

console.log("Checking roles & elements specific keywords...");

let roleElementIssues = [];

roles.forEach(role => {
  elements.forEach(element => {
    const res = runSimulation({
      race: 'forest',
      grade: 'UR',
      bodyType: 'standard',
      style: 'style_b',
      role,
      element,
      removeBg: true,
      mode: 'illust'
    });

    // Check weapon / magic conflicts in neg
    if (role === 'ranger' && /\b(?:bow|arrows|quiver)\b/i.test(res.neg)) {
      roleElementIssues.push(`Ranger weapons forbidden in neg!`);
    }
    if (role === 'mage' && /\b(?:staff|magic wand)\b/i.test(res.neg)) {
      roleElementIssues.push(`Mage weapons forbidden in neg!`);
    }
    if (role === 'warrior' && /\b(?:sword|blade)\b/i.test(res.neg)) {
      roleElementIssues.push(`Warrior weapons forbidden in neg!`);
    }
    if (element === 'shock' && /\b(?:lightning|electric)\b/i.test(res.neg)) {
      roleElementIssues.push(`Shock element forbidden in neg!`);
    }
    if (element === 'fire' && /\b(?:flames|fire)\b/i.test(res.neg)) {
      roleElementIssues.push(`Fire element forbidden in neg!`);
    }
    if (element === 'frost' && /\b(?:ice|frost|crystals)\b/i.test(res.neg)) {
      roleElementIssues.push(`Frost element forbidden in neg!`);
    }
  });
});

console.log(`Role & Element tests done. Issues: ${roleElementIssues.length}`);
if (roleElementIssues.length > 0) {
  console.log(roleElementIssues);
} else {
  console.log("🎉 ALL Roles & Elements passed with ZERO conflicts!");
}
