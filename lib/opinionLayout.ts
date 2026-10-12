export type Rect = { x: number; y: number; width: number; height: number };
export type MeasuredOpinion = { id: string; width: number; height: number };
export type PlacedOpinion = MeasuredOpinion & { x: number; y: number };
const contains = (a: Rect, b: Rect) => a.x <= b.x && a.y <= b.y && a.x+a.width >= b.x+b.width && a.y+a.height >= b.y+b.height;
export const overlaps = (a: Rect, b: Rect) => a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
function subtract(free: Rect[], used: Rect) {
  const next: Rect[] = [];
  for(const r of free) {
    if(!overlaps(r,used)) { next.push(r); continue; }
    if(used.x > r.x) next.push({...r,width:used.x-r.x});
    if(used.x+used.width < r.x+r.width) next.push({...r,x:used.x+used.width,width:r.x+r.width-used.x-used.width});
    if(used.y > r.y) next.push({...r,height:used.y-r.y});
    if(used.y+used.height < r.y+r.height) next.push({...r,y:used.y+used.height,height:r.y+r.height-used.y-used.height});
  }
  return next.filter((r,i) => r.width>0 && r.height>0 && !next.some((other,j) => i!==j && contains(other,r) && (!contains(r,other) || j<i)));
}
// MaxRects packing using measured DOM sizes. Centre and padding are obstacles.
export function placeOpinions(width: number, height: number, centre: Rect, measured: MeasuredOpinion[], previous: PlacedOpinion[] = [], gap = 12): PlacedOpinion[] | null {
  let free = subtract([{x:gap,y:gap,width:width-2*gap,height:height-2*gap}], {x:centre.x-gap,y:centre.y-gap,width:centre.width+2*gap,height:centre.height+2*gap});
  const placed: PlacedOpinion[] = [];
  const ordered = [...measured].sort((a,b) => b.height-a.height || b.width-a.width || a.id.localeCompare(b.id));
  for(const item of ordered) {
    const index = measured.findIndex(m => m.id===item.id);
    const old = previous.find(m => m.id===item.id);
    const angle = index*2.399963229728653;
    const desired = old || {x:width/2+Math.cos(angle)*width*.36-item.width/2,y:height/2+Math.sin(angle)*height*.34-item.height/2};
    const w = item.width+gap, h=item.height+gap;
    let best: {x:number;y:number;score:number}|null=null;
    for(const r of free) {
      if(r.width<w || r.height<h) continue;
      const candidates = [
        {x:r.x,y:r.y},{x:r.x+r.width-w,y:r.y},{x:r.x,y:r.y+r.height-h},{x:r.x+r.width-w,y:r.y+r.height-h},
        {x:Math.max(r.x,Math.min(desired.x,r.x+r.width-w)),y:Math.max(r.y,Math.min(desired.y,r.y+r.height-h))},
      ];
      for(const c of candidates) {
        const score = (c.x-desired.x)**2+(c.y-desired.y)**2 + Math.min(r.width-w,r.height-h)*20;
        if(!best || score<best.score) best={...c,score};
      }
    }
    if(!best) return null;
    placed.push({...item,x:best.x,y:best.y});
    free = subtract(free,{x:best.x,y:best.y,width:w,height:h});
  }
  return placed;
}
