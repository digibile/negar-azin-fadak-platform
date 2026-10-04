"use client";

import {useState} from "react";

export default function PasswordField(){
 const [visible,setVisible]=useState(false);
 return <div className="password-field">
  <input
   name="password"
   type={visible?"text":"password"}
   autoComplete="current-password"
   required
  />
  <button
   type="button"
   className="password-toggle"
   aria-label={visible?"مخفی کردن رمز عبور":"نمایش رمز عبور"}
   aria-pressed={visible}
   onClick={()=>setVisible(v=>!v)}
  >
   {visible?"◉":"◌"}
  </button>
 </div>;
}
