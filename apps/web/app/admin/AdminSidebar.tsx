"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {usePathname} from "next/navigation";
import {api} from "../../lib/api";
import {MASTER_MENU} from "./master-menu";
import styles from "./AdminSidebar.module.css";

type MenuNode={
 id:string|number;
 menu_key:string|null;
 parent_id:string|number|null;
 title:string;
 path:string;
 icon?:string|null;
 sort_order:number;
 permission:string|null;
 children?:string[];
 child_items?:MenuNode[];
 is_shared?:boolean;
};

type ModuleItem={code:string;title:string;is_active?:boolean;route?:string|null};
type MasterChild={title:string;legacyCode?:string;moduleCode?:string};

function SearchIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
function ChevronIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function HomeIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10.5a1 1 0 0 1-1 1h-5.5v-6h-4v6H4.5a1 1 0 0 1-1-1V10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
function CloseIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}

function normalize(nodes:MenuNode[]):MenuNode[]{return [...nodes].sort((a,b)=>a.sort_order-b.sort_order||String(a.id).localeCompare(String(b.id)))}
function allTitles(node:MenuNode):string{return [node.title,...(node.child_items||[]).map(allTitles)].join(" ")}
function menuHref(path:string|undefined,parent:string,title:string){
 if(path&&path!=="#")return path;
 const joiner=parent.includes("?")?"&":"?";
 return parent+joiner+"menu="+encodeURIComponent(title);
}
function hasPath(node:MenuNode,path:string):boolean{
 if(node.path===path)return true;
 return (node.child_items||[]).some(child=>hasPath(child,path));
}
function TreeNode({node,href,pathname,closeMobile,depth}:{node:MenuNode;href:string;pathname:string;closeMobile:()=>void;depth:number}){
 const [expanded,setExpanded]=useState(false);
 const children=normalize(node.child_items||[]);
 const active=href===pathname||children.some(x=>hasPath(x,pathname));
 useEffect(()=>{if(active)setExpanded(true)},[active]);
 return <div className={styles["tree-child-node"]+" "+(active?styles["child-active"]:"")}>
  <div className={styles["tree-child-head"]}>
   <span className={styles["master-child-index"]}>{depth===0?"01":"↳"}</span>
   <Link href={href} onClick={closeMobile}>{node.title}</Link>
   {children.length>0&&<button type="button" className={styles["master-chevron-button"]} onClick={()=>setExpanded(x=>!x)} aria-expanded={expanded} aria-label={(expanded?"بستن ":"باز کردن ")+node.title}><span className={styles["master-chevron"]}><ChevronIcon/></span></button>}
  </div>
  {expanded&&children.length>0&&<div className={styles["tree-grandchildren"]}>
   {children.map(child=><TreeNode key={child.id} node={child} href={menuHref(child.path,href,child.title)} pathname={pathname} closeMobile={closeMobile} depth={depth+1}/>)}
  </div>}
 </div>;
}


const LEGACY_BY_MASTER:Record<string,string>={}; const canonical=useMemo(()=>MASTER_MENU.map(item=>{
  const route=item.route||(
   item.moduleCode&&moduleSet.has(item.moduleCode)
    ? "/modules/?code="+encodeURIComponent(item.moduleCode)
    : "#"
  );
  const children=item.children.map((child:MasterChild,i)=>{
   const legacyCode=child.legacyCode||"";
   const db=dbByLegacy.get(legacyCode);
   const childRoute=legacyCode
    ? "/modules/?code="+encodeURIComponent(legacyCode)
    : (child.moduleCode&&moduleSet.has(child.moduleCode)
      ? "/modules/?code="+encodeURIComponent(child.moduleCode)
      : route+"?menu="+encodeURIComponent(child.title));
   return {id:item.code+"-"+i,title:child.title,path:childRoute,sort_order:i,db,dbChildren:normalize(db?.child_items||[])};
  });
  return {...item,route,children};
 }),[dbByLegacy,moduleSet]);       {item.children.map((child,i)=>{
        const href=child.path;
        const synthetic:MenuNode={id:child.id,menu_key:child.db?.menu_key||null,parent_id:child.db?.parent_id||null,title:child.title,path:href,sort_order:i,permission:child.db?.permission||null,child_items:child.dbChildren};
        return <TreeNode key={child.id} node={synthetic} href={href} pathname={pathname} closeMobile={closeMobile} depth={0}/>;
       })}
}