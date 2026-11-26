import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useVisionRealtime(org:string|undefined|null) {
  const qc=useQueryClient();
  useEffect(()=>{
    if(!org)return;
    let subscribed=false;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const refresh=()=>{clearTimeout(timer);timer=setTimeout(()=>{for(const key of ["roboflow-requests","inference-runs","dashboard","alerts","engine-config","roboflow-config"])void qc.invalidateQueries({queryKey:[key]});},300);};
    const channel=supabase.channel(`vision:${org}`,{config:{private:true}}).on("broadcast",{event:"vision_changed"},refresh).subscribe(status=>{
      if(status==="SUBSCRIBED") {
        const state=qc.getQueryState(["roboflow-requests"]);
        if(subscribed||state&&Date.now()-state.dataUpdatedAt>10000&&state.fetchStatus!=="fetching")refresh();
        subscribed=true;
      }
    });
    return()=>{clearTimeout(timer);void supabase.removeChannel(channel);};
  },[org,qc]);
}