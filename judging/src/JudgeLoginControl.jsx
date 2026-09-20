import React, {useEffect,useState} from "react";
import {api} from "./client.js";
export function JudgeLoginControl(){
 const [enabled,setEnabled]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function load(){try{const d=await api("judge-login");setEnabled(d.enabled);setError("");}catch(e){setError(e.message);}}
 useEffect(()=>{load();},[]);
 async function toggle(){setBusy(true);setError("");try{const d=await api("judge-login",{enabled:!enabled});setEnabled(d.enabled);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="card judge-login-control"><div><strong>Judge login: {enabled===null?"Loading…":enabled?"Open":"Closed"}</strong><p className="muted">{enabled?"Judges can sign in.":"Judges cannot start a new session until login is opened."} Existing sessions stay signed in.</p></div>{enabled!==null&&<button className="primary" disabled={busy} onClick={toggle}>{busy?"Saving…":enabled?"Close judge login":"Open judge login"}</button>}{error&&<p className="error" role="alert">{error} <button onClick={load}>Refresh</button></p>}</section>;
}
