import styles from "./CanonicalPartyReference.module.css";

export function CanonicalPartyReference({partyId,title}:{partyId:string|null|undefined;title:string|null|undefined}){
 const linked=Boolean(partyId);
 return <span className={styles.reference+" "+(linked?styles.linked:styles.unlinked)} aria-label={linked?"متصل به طرف‌حساب مرکزی":"بدون پیوند به طرف‌حساب مرکزی"}>
  <i aria-hidden="true"/>
  <span>{linked?<>طرف‌حساب مرکزی: <b>{title||"متصل"}</b></>:"پیوند هویتی ثبت نشده"}</span>
 </span>;
}
