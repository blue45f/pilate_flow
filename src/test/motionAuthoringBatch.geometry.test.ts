import { describe, expect, it } from 'vitest';
import { BATCH_IDS, BATCH_PHASES, getBatchPose, projectBatchPoint } from '../models/motionAuthoringBatch';
import type { BatchPoint, BatchPose } from '../models/motionAuthoringBatch';
import { BATCH_PATTERN_REFERENCES, BATCH_SOURCE_FACTS, BATCH_VARIANTS, getBatchPatternReferences } from '../data/motionAuthoringBatch';

const distance=(a:BatchPoint,b:BatchPoint)=>Math.hypot(...a.map((value,i)=>value-b[i]));
const shape=(pose:BatchPose)=>({trunk:pose.trunk,head:pose.head,limbs:pose.limbs,contacts:pose.contacts,equipment:pose.equipment});
const points=(pose:BatchPose):BatchPoint[]=>[
  ...pose.trunk,...Object.values(pose.head),...Object.values(pose.limbs).flatMap(limb=>[limb.hip,limb.knee,limb.ankle,limb.heel,limb.toe,limb.shoulder,limb.elbow,limb.hand]),
  ...pose.contacts.flatMap(contact=>[contact.bodyPoint,contact.anchorPoint]),...pose.equipment.flatMap(item=>item.points),
];

describe('four individually authored motion variants',()=>{
  it.each(BATCH_IDS)('%s has finite, in-view geometry throughout both anatomical sides and mirror modes',id=>{
    for(const activeSide of ['left','right'] as const) for(let sample=0;sample<=400;sample++) {
      const pose=getBatchPose(id,sample/400,{activeSide});
      for(const point of points(pose)) {
        if (!point.every(Number.isFinite)) throw new Error(`${id}: nonfinite world point`);
        if (point[2]<-1e-8) throw new Error(`${id}: point below support plane`);
        for(const mirrored of [false,true]) {
          const screen=projectBatchPoint(point,mirrored,pose.camera.id);
          if(screen[0]<0||screen[0]>640) throw new Error(`${id}: x outside view`);
          if(screen[1]<0||screen[1]>360) throw new Error(`${id}: y outside view`);
        }
      }
      for(const contact of pose.contacts) {
        if(contact.anchorPoint[2] !== (contact.target==='chair-seat'?106:0)) throw new Error(`${id}: anchor outside support surface`);
        if(contact.state==='fixed' && distance(contact.bodyPoint,contact.anchorPoint)>1e-8) throw new Error(`${id}: fixed contact drift`);
      }
      const mirrored=getBatchPose(id,sample/400,{activeSide,mirrored:true});
      if(JSON.stringify(shape(mirrored))!==JSON.stringify(shape(pose))) throw new Error(`${id}: screen mirror changed world geometry`);
    }
  });
  it.each(BATCH_IDS)('%s returns exactly to its start and preserves each rigid link length',id=>{
    const start=getBatchPose(id,0),finish=getBatchPose(id,1);
    expect(shape(start)).toEqual(shape(finish));
    for(let sample=0;sample<=100;sample++) {
      const pose=getBatchPose(id,sample/100);
      for(let i=1;i<pose.trunk.length;i++) expect(distance(pose.trunk[i],pose.trunk[i-1])).toBeCloseTo(distance(start.trunk[i],start.trunk[i-1]),8);
      for(const side of ['left','right'] as const) {
        const limb=pose.limbs[side],initial=start.limbs[side];
        for(const [a,b] of [['hip','knee'],['knee','ankle'],['ankle','toe'],['shoulder','elbow'],['elbow','hand']] as const) expect(distance(limb[a],limb[b])).toBeCloseTo(distance(initial[a],initial[b]),8);
      }
    }
  });
  it('keeps the intended moving structures and support structures distinct',()=>{
    const arm=getBatchPose('chair-seated-bilateral-arm-raise-v1',.5),armStart=getBatchPose(arm.variantId,0);
    expect(arm.trunk).toEqual(armStart.trunk);
    for(const side of ['left','right'] as const) {
      expect(arm.limbs[side].hand[2]).toBeGreaterThan(armStart.limbs[side].hand[2]+150);
      expect(arm.limbs[side].hip).toEqual(armStart.limbs[side].hip);
    }
    const bend=getBatchPose('chair-seated-overhead-sidebend-v1',.5,{activeSide:'left'});
    expect(bend.trunk.at(-1)![1]).toBeGreaterThan(15);
    expect(bend.limbs.right.hand[2]).toBeGreaterThan(bend.head.center[2]);
    expect(bend.contacts.some(contact=>contact.id.includes('hand'))).toBe(false);
    const leg=getBatchPose('prone-single-straight-leg-extension-v1',.5,{activeSide:'left'}),legStart=getBatchPose(leg.variantId,0,{activeSide:'left'});
    expect(leg.limbs.left.ankle[2]).toBeGreaterThan(legStart.limbs.left.ankle[2]+40);
    expect(leg.limbs.right).toEqual(legStart.limbs.right);
    expect(leg.trunk).toEqual(legStart.trunk);
    expect(leg.contacts.filter(contact=>contact.state==='released').map(contact=>contact.id)).toEqual(['left-forefoot']);
    const chest=getBatchPose('prone-forearm-chest-extension-v1',.5),chestStart=getBatchPose(chest.variantId,0);
    expect(chest.limbs.left.shoulder[2]).toBeGreaterThan(chestStart.limbs.left.shoulder[2]+15);
    expect(chest.trunk[0]).toEqual(chestStart.trunk[0]);
    expect(chest.contacts.every(contact=>contact.state==='fixed')).toBe(true);
    expect(new Set(BATCH_IDS.map(id=>JSON.stringify(shape(getBatchPose(id,.5))))).size).toBe(4);
  });
  it('clamps finite progress but rejects nonfinite inputs and unknown identities',()=>{
    expect(getBatchPose(BATCH_IDS[0],-10).progress).toBe(0);
    expect(getBatchPose(BATCH_IDS[0],10).progress).toBe(1);
    for(const value of [NaN,Infinity,-Infinity]) expect(()=>getBatchPose(BATCH_IDS[0],value)).toThrow(RangeError);
    expect(()=>getBatchPose('unknown' as never,0)).toThrow(RangeError);
    expect(()=>getBatchPose(BATCH_IDS[0],0,{activeSide:'screen-left' as never})).toThrow(RangeError);
  });
  it('gives each variant five complete ordered static phases with a genuine move and return',()=>{
    for(const id of BATCH_IDS) {
      expect(BATCH_PHASES[id].map(phase=>phase.id)).toEqual(['setup','move','turn','return','finish']);
      expect(BATCH_PHASES[id][0].start).toBe(0);expect(BATCH_PHASES[id][4].end).toBe(1);
      expect(BATCH_PHASES[id].every((phase,i,list)=>phase.sample>=phase.start && phase.sample<=phase.end && (!i||phase.start===list[i-1].end))).toBe(true);
      expect(getBatchPose(id,.5).amount).toBe(1);expect(getBatchPose(id,0).amount).toBe(0);
    }
  });
});

describe('honest related-pattern mapping and source boundaries',()=>{
  it('publishes four stable unique authored assets and preserves every review/eligibility boundary',()=>{
    expect(BATCH_VARIANTS.map(item=>item.id)).toEqual(BATCH_IDS);
    expect(new Set(BATCH_PATTERN_REFERENCES.map(item=>item.variantId)).size).toBe(4);
    for(const variant of BATCH_VARIANTS) {
      expect(variant).toMatchObject({status:'variant-proposal',assetStatus:'authored-unreviewed-draft',professionalReviewStatus:'unreviewed',professionalReviewCount:0,exactAssetReady:false,autoRecommendationEligible:false,exactSourceVariantMatched:false,safetyStatus:'not_assessed',license:'0BSD'});
      expect(variant.unknown.length).toBeGreaterThan(0);expect(variant.mismatched.length).toBeGreaterThan(0);
      expect(getBatchPatternReferences(variant.intendedExerciseId)).toEqual([expect.objectContaining({variantId:variant.id,relation:'pattern-reference',exactCanonicalMatch:false})]);
      expect(getBatchPatternReferences(variant.id)).toEqual([]);
    }
    for(const source of BATCH_SOURCE_FACTS) {
      expect(new URL(source.url).hostname).toMatch(/\.nhs\.uk$/);
      expect(source).toMatchObject({checkedAt:'2026-11-05',verification:'public-text-checked',expertChecked:false,videoWatched:false,mediaLicense:null,mediaReused:false});
    }
  });
});
