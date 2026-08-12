#!/usr/bin/env python3
import subprocess, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[1]
js = r"""
import * as m from './js/game-data.js';
const failures=[];
const ids = [
  ['ringResizingTechnicalGuideV1', 14, 'サイズ直し'],
  ['jewelrySolderingBrazingProfessionalGuideV1', 23, 'ロー付け'],
  ['preciousMetalJewelryFinishingProfessionalGuideV1', 44, '仕上げ'],
  ['stoneSettingProfessionalEncyclopedicGuideV1', 60, '石留め'],
  ['gemstoneLapidaryCuttingPolishingProfessionalGuideV1', 53, '宝石研磨'],
];
for (const [id, chapters, shortTitle] of ids) {
  const d=m.PROCESSING_KNOWLEDGE[id];
  if (!d) { failures.push(`${id} missing`); continue; }
  if (d.shortTitle !== shortTitle) failures.push(`${id} shortTitle=${d.shortTitle}`);
  if (!Array.isArray(d.sections) || d.sections.length !== chapters) failures.push(`${id} chapters=${d.sections?.length}`);
  const titleOk = id === 'stoneSettingProfessionalEncyclopedicGuideV1'
    ? d.sections?.every((s,i)=>String(s.title||'').startsWith(`${i}. `))
    : id === 'gemstoneLapidaryCuttingPolishingProfessionalGuideV1'
      ? d.sections?.slice(0,50).every((s,i)=>String(s.title||'').startsWith(`${i+1}. `))
        && String(d.sections?.[50]?.title||'').startsWith('付録 A')
        && String(d.sections?.[51]?.title||'').startsWith('付録 B')
        && String(d.sections?.[52]?.title||'').startsWith('付録 C')
      : d.sections?.every((s,i)=>String(s.title||'').startsWith(`${i+1}. `));
  if (!titleOk) failures.push(`${id} chapter order/title broken`);
}
const expected = ids.map(x=>x[0]);
if (JSON.stringify(m.PROCESSING_KNOWLEDGE_SEQUENCE)!==JSON.stringify(expected)) failures.push(`sequence=${JSON.stringify(m.PROCESSING_KNOWLEDGE_SEQUENCE)}`);
const f=m.PROCESSING_KNOWLEDGE.preciousMetalJewelryFinishingProfessionalGuideV1;
if (f?.revision !== 'v2.0 / 2026-08-12') failures.push(`finishing revision=${f?.revision}`);
const chapter44 = f?.sections?.[43]?.paragraphs?.join(' ').replace(/\s+/g,' ') || '';
if (!chapter44.includes('付録 A 仕上げ設計の 50 原則')) failures.push('Appendix A missing from chapter 44');
if (!chapter44.includes('付録 B 現場用 1 ページ判定フロー')) failures.push('Appendix B missing from chapter 44');

const st=m.PROCESSING_KNOWLEDGE.stoneSettingProfessionalEncyclopedicGuideV1;
if (st?.revision !== 'v2.0 / 2026-08-12') failures.push(`stone revision=${st?.revision}`);
const principles = st?.sections?.[54]?.paragraphs?.filter(x=>/^\d+\.\s/.test(String(x))) || [];
if (principles.length !== 70) failures.push(`stone principles=${principles.length}`);
const benchmark = st?.sections?.[55]?.paragraphs || [];
if (benchmark.length !== 13 || !benchmark.some(x=>String(x).includes('Prong angle') && String(x).includes('70-80°'))) failures.push(`stone benchmark rows=${benchmark.length}`);
if (!String(st?.sections?.[21]?.title||'').includes('レル留め')) failures.push('stone source title 21 changed');
if (!String(st?.sections?.[32]?.title||'').includes('トップ az')) failures.push('stone source title 32 changed');
if (!String(st?.sections?.[55]?.title||'').includes('値ベンチマク')) failures.push('stone source title 55 changed');
if (!String(st?.sections?.[58]?.title||'').includes('考資料技術根')) failures.push('stone source title 58 changed');
if (!Array.isArray(st?.references) || st.references.length !== 27 || !st.references[0]?.startsWith('[R1]') || !st.references[26]?.startsWith('[R27]')) failures.push(`stone refs=${st?.references?.length}`);
const finalPrinciple = st?.sections?.[59]?.paragraphs?.join(' ') || '';
if (!finalPrinciple.includes('最小限の地金移動') || !finalPrinciple.includes('将来の摩耗後にも安全余裕')) failures.push('stone final principle missing');

const lap=m.PROCESSING_KNOWLEDGE.gemstoneLapidaryCuttingPolishingProfessionalGuideV1;
if (lap?.revision !== 'v1.0 / 2026-08-12') failures.push(`lapidary revision=${lap?.revision}`);
const lapPrinciples=lap?.sections?.[52]?.paragraphs?.filter(x=>/^\d+\.\s/.test(String(x))) || [];
if (lapPrinciples.length !== 70) failures.push(`lapidary principles=${lapPrinciples.length}`);
if (!Array.isArray(lap?.references) || lap.references.length !== 29 || !lap.references[0]?.startsWith('[R1]') || !lap.references[28]?.startsWith('[R29]')) failures.push(`lapidary refs=${lap?.references?.length}`);
const risk=lap?.sections?.[49]?.paragraphs?.join(' ') || '';
if (!risk.includes('Diamond') || !risk.includes('Ruby/Sapphire') || !risk.includes('Opal')) failures.push('lapidary risk matrix incomplete');

if (failures.length) { console.error('FAIL processing knowledge'); failures.forEach(x=>console.error('-',x)); process.exit(1); }
console.log(`PASS processing knowledge: sequence=${m.PROCESSING_KNOWLEDGE_SEQUENCE.join(' -> ')} / finishing=${f.sections.length} chapters / stone=${st.sections.length} sections / stone-principles=${principles.length} / stone-refs=${st.references.length} / lapidary=${lap.sections.length} sections / lapidary-principles=${lapPrinciples.length} / lapidary-refs=${lap.references.length}`);
"""
p = subprocess.run(['node','--input-type=module','-e',js], cwd=root, text=True, capture_output=True)
print(p.stdout, end=''); print(p.stderr, end='', file=sys.stderr)
sys.exit(p.returncode)
