export type LifecycleMap=Readonly<Record<string,readonly string[]>>;

export const salesOrderTransitions:LifecycleMap={
 draft:["pending_credit","cancelled"],
 pending_credit:["confirmed","cancelled"],
 confirmed:["reserved","cancelled"],
 reserved:["delivering","cancelled"],
 delivering:["delivered","cancelled"],
 delivered:["invoiced","returned"],
 invoiced:["returned"],
 returned:[],
 cancelled:[]
};

export const purchaseOrderTransitions:LifecycleMap={
 draft:["approved","cancelled"],
 approved:["sent","cancelled"],
 sent:["partially_received","received","cancelled"],
 partially_received:["received","cancelled"],
 received:["invoiced"],
 invoiced:["paid"],
 paid:[],
 cancelled:[]
};

export function isAllowedLifecycleTransition(map:LifecycleMap,from:string,to:string):boolean{
 return map[from]?.includes(to)===true;
}
