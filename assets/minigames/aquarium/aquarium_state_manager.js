export class AquariumStateManager {
  constructor(config, state) { this.config = config; this.state = structuredClone(state); }
  fishDefinition(id){ return this.config.fish.find(x=>x.id===id); }
  plantDefinition(id){ return this.config.plants.find(x=>x.id===id); }
  displayDefinition(id){ return this.config.displayItems.find(x=>x.id===id); }
  fishLoad(){ return this.config.fish.reduce((sum,d)=>sum+(this.state.fish[d.id]?.inTank||0)*d.loadPoint,0); }
  plantTotal(){ return this.config.plants.reduce((sum,d)=>sum+(this.state.plants[d.id]?.inTank||0),0); }
  canAcquireFish(id, qty=1){
    const d=this.fishDefinition(id), s=this.state.fish[id];
    if(!d||!s) return {ok:false,reason:'unknown'};
    if(s.owned+qty>d.speciesMax) return {ok:false,reason:'species',message:this.config.rules.messages.fishSpeciesLimit};
    return {ok:true};
  }
  canAddFishToTank(id, qty=1){
    const d=this.fishDefinition(id), s=this.state.fish[id];
    if(!d||!s) return {ok:false,reason:'unknown'};
    if(s.inTank+qty>d.speciesMax) return {ok:false,reason:'species',message:this.config.rules.messages.fishSpeciesLimit};
    if(this.fishLoad()+qty*d.loadPoint>this.config.capacity.fishLoadMax) return {ok:false,reason:'load',message:this.config.rules.messages.fishLoadLimit};
    if(s.inTank+qty>s.owned) return {ok:false,reason:'owned'};
    return {ok:true};
  }
  canAcquirePlant(id,qty=1){
    const d=this.plantDefinition(id),s=this.state.plants[id];
    if(!d||!s)return {ok:false,reason:'unknown'};
    if(s.owned+qty>d.speciesMax)return {ok:false,reason:'species',message:this.config.rules.messages.plantSpeciesLimit};
    return {ok:true};
  }
  canAddPlantToTank(id,qty=1){
    const d=this.plantDefinition(id),s=this.state.plants[id];
    if(!d||!s)return {ok:false,reason:'unknown'};
    if(s.inTank+qty>d.speciesMax)return {ok:false,reason:'species',message:this.config.rules.messages.plantSpeciesLimit};
    if(this.plantTotal()+qty>this.config.capacity.plantTotalMax)return {ok:false,reason:'total',message:this.config.rules.messages.plantTotalLimit};
    if(s.inTank+qty>s.owned)return {ok:false,reason:'owned'};
    return {ok:true};
  }
  canAcquireDisplay(id,qty=1){
    const d=this.displayDefinition(id),s=this.state.displayItems[id];
    if(!d||!s)return {ok:false,reason:'unknown'};
    if(s.owned+qty>d.ownedMax)return {ok:false,reason:'limit',message:this.config.rules.messages.displayLimit};
    return {ok:true};
  }
  canInstallDisplay(id,qty=1){
    const d=this.displayDefinition(id),s=this.state.displayItems[id];
    if(!d||!s)return {ok:false,reason:'unknown'};
    if(d.required)return {ok:false,reason:'required'};
    if(s.installed+qty>d.installedMax||s.installed+qty>s.owned)return {ok:false,reason:'limit'};
    return {ok:true};
  }
  snapshot(){ this.state.fishLoad.current=this.fishLoad(); return structuredClone(this.state); }
}
