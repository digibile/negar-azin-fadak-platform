"use client";

import {useEffect,useRef,useState} from "react";

type Props={value?:string;onChange:(value:string)=>void;label?:string;disabled?:boolean};

export default function VoiceInput({value="",onChange,label="ورودی صوتی",disabled=false}:Props){
 const [recording,setRecording]=useState(false),[supported,setSupported]=useState(false),[error,setError]=useState("");
 const recognition=useRef<any>(null);
 useEffect(()=>{
  const R=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  if(!R)return;
  setSupported(true);
  const r=new R();r.lang="fa-IR";r.interimResults=true;r.continuous=false;
  r.onresult=(e:any)=>{let text="";for(let i=e.resultIndex;i<e.results.length;i++)text+=e.results[i][0].transcript;onChange((value?value+" ":"")+text)};
  r.onerror=()=>{setError("تشخیص گفتار در این دستگاه در دسترس نیست.")};
  r.onend=()=>setRecording(false);recognition.current=r;
  return()=>{try{r.abort()}catch{}};
 },[onChange,value]);
 if(!supported)return null;
 return <button type="button" disabled={disabled} aria-label={label} title={label} onClick={()=>{setError("");if(recording){recognition.current?.stop();setRecording(false)}else{setRecording(true);recognition.current?.start()}}} style={{borderRadius:10,padding:"9px 12px",border:"1px solid #dfe5ed",background:recording?"#fff2f0":"#fff",color:recording?"#b42318":"#152238"}}>{recording?"■ توقف":"🎙 ورود با صدا"}{error&&<small style={{display:"block",fontSize:9,marginTop:4}}>{error}</small>}</button>;
}
