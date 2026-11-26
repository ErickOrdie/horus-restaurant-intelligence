import { z } from "zod";
import { normalizePredictions, pointInPolygon, type Zone } from "./roboflow";

export const RESTAURANT_WORKFLOW = "restaurant-people-and-table-counts-1795663226516";
export const TableStateSchema = z.enum(["disponivel", "ocupada", "aguardando_limpeza", "em_limpeza", "indeterminada"]);
export type TableState = z.infer<typeof TableStateSchema>;
const stateMap: Record<string, TableState> = { occupied: "ocupada", vacant_no_visible_items: "disponivel", vacant_needs_clearing: "aguardando_limpeza", unknown: "indeterminada" };
const Output = z.object({
  visible_people_count: z.number().int().nonnegative().optional(),
  visible_table_count: z.number().int().nonnegative().optional(),
  predictions: z.object({ image: z.object({ width: z.number().positive().nullable(), height: z.number().positive().nullable() }), predictions: z.array(z.unknown()) }),
  table_states: z.array(z.object({ table_id: z.number().int(), state: z.string(), bbox_xyxy: z.tuple([z.number(),z.number(),z.number(),z.number()]) })).optional(),
  output_image: z.object({ type: z.literal("base64"), value: z.string() }).optional(),
});
export type RestaurantSnapshot = {
  people: number | null; tables: number | null;
  states: { state: TableState; bbox: [number,number,number,number] }[];
  temporalValidated: false;
};
export function normalizeRestaurant(body: unknown) {
  const envelope = z.object({ outputs: z.array(z.unknown()).length(1) }).parse(body);
  const o = Output.parse(envelope.outputs[0]);
  const width = o.predictions.image.width, height = o.predictions.image.height;
  // The published workflow returns null dimensions on genuine empty detections.
  const detections = o.predictions.predictions.length === 0 ? [] : normalizePredictions(o.predictions).detections;
  if (o.table_states?.length && (!width || !height)) throw new Error("Dimensions absentes pour les états de tables.");
  const snapshot: RestaurantSnapshot = { people:o.visible_people_count ?? null, tables:o.visible_table_count ?? null, temporalValidated:false,
    states:(o.table_states ?? []).map(s => ({ state:stateMap[s.state] ?? "indeterminada", bbox:s.bbox_xyxy.map((n,i) => Math.min(1,Math.max(0,n / (i % 2 === 0 ? width ?? 1 : height ?? 1)))) as [number,number,number,number] })) };
  // Never retain person track IDs, visits or duration fields from temporal output.
  const processedImage = o.output_image?.value && /^[A-Za-z0-9+/]+={0,2}$/.test(o.output_image.value) ? `data:image/jpeg;base64,${o.output_image.value}` : null;
  return { detections, snapshot, processedImage };
}
export function snapshotCounts(s: RestaurantSnapshot) {
  const count = (state:TableState) => s.states.filter(t=>t.state===state).length;
  return { occupied:count("ocupada"), available:count("disponivel"), awaiting:count("aguardando_limpeza"), cleaning:count("em_limpeza"), unknown:s.tables === null ? null : Math.max(0,s.tables-s.states.filter(t=>t.state!=="indeterminada").length), occupancy:s.states.length ? count("ocupada")/s.states.length*100 : null };
}
export function matchTableRegions(states:RestaurantSnapshot["states"], regions:{table_id:string;points:Zone["points"]}[]) {
  return regions.map(r=>{
    const matches=states.filter(s=>pointInPolygon((s.bbox[0]+s.bbox[2])/2,(s.bbox[1]+s.bbox[3])/2,r.points));
    const first=matches[0];
    const ambiguous=first && regions.filter(other=>pointInPolygon((first.bbox[0]+first.bbox[2])/2,(first.bbox[1]+first.bbox[3])/2,other.points)).length!==1;
    return {table_id:r.table_id,state:matches.length===1 && first && !ambiguous ? first.state : "indeterminada" as TableState};
  });
}
export function occupancyHistory(rows:{people_count:number|null;occupancy_percent:number|null;created_at:string}[]) {
  const people=rows.flatMap(r=>r.people_count===null?[]:[r.people_count]);
  const occ=rows.flatMap(r=>r.occupancy_percent===null?[]:[r.occupancy_percent]);
  return { averagePeople:people.length?people.reduce((a,b)=>a+b,0)/people.length:null, peakPeople:people.length?Math.max(...people):null, averageOccupancy:occ.length?occ.reduce((a,b)=>a+b,0)/occ.length:null };
}