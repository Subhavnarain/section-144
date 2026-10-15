// Section 144 shared helpers: config, backend client, identity, share card, QR.
(function(){
  const CFG=window.S144_CONFIG||{};
  const S={};
  S.BASE=CFG.publicUrl||(location.origin+location.pathname.replace(/index\.html$/,''));
  S.sb=null;
  try{if(window.supabase&&CFG.supabaseUrl&&CFG.supabaseKey)S.sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false},realtime:{params:{eventsPerSecond:30}}})}catch(e){S.sb=null}
  S.online=!!S.sb;
  const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  S.ls=ls;
  S.playerId=function(){let id=ls.get('s144pid');if(!id||!/^[0-9a-f-]{36}$/.test(id)){id=(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16)}));ls.set('s144pid',id)}return id};
  const BAD=/(fuck|shit|bitch|cunt|nigg|fag|rape|chutiya|madarchod|bhenchod|behenchod|bhosdi|gaand|randi|lund|harami|kutta|kamina|mc\b|bc\b)/i;
  S.cleanName=function(v){v=String(v||'').replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,16);if(!v||BAD.test(v.replace(/[^a-z]/gi,'')))return'Anon';return v};
  S.fmt=s=>Number(s).toFixed(1)+'s';
  S.roomCode=function(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ';let c='';for(let i=0;i<4;i++)c+=A[Math.floor(Math.random()*A.length)];return c};
  S.challengeUrl=function(rec){const u=new URL(S.BASE);u.searchParams.set('beat',rec.seconds.toFixed(1));u.searchParams.set('by',S.cleanName(rec.name));u.searchParams.set('s',rec.side);return u.toString()};
  S.prettyUrl=()=>S.BASE.replace(/^https?:\/\//,'').replace(/\/$/,'');

  // ---- leaderboard backend (public site) ----
  S.fetchBoard=async function(){if(!S.sb)throw new Error('offline');
    const{data,error}=await S.sb.from('scores').select('player_id,side,name,seconds,peak').order('seconds',{ascending:false}).limit(100);
    if(error)throw error;return(data||[]).map(r=>({id:r.player_id,side:r.side,name:r.name,seconds:Number(r.seconds),peak:r.peak}))};
  S.submitScore=async function(rec){if(!S.sb)throw new Error('offline');
    const{error}=await S.sb.rpc('submit_score',{p_player:S.playerId(),p_name:S.cleanName(rec.name),p_side:rec.side,p_seconds:Math.round(rec.seconds*10)/10,p_peak:rec.peak|0});if(error)throw error};

  // ---- realtime rooms (TV <-> phone controller) ----
  S.room=function(code,onMsg,onStatus){
    if(!S.sb)return null;
    const ch=S.sb.channel('s144-'+code,{config:{broadcast:{self:false,ack:false}}});
    ch.on('broadcast',{event:'m'},({payload})=>{try{onMsg(payload||{})}catch(e){console.error(e)}});
    ch.subscribe(st=>onStatus&&onStatus(st));
    return{send:p=>ch.send({type:'broadcast',event:'m',payload:p}),close:()=>{try{S.sb.removeChannel(ch)}catch(e){}}};
  };

  // ---- QR ----
  S.qrCanvas=function(text,size,fg,bg){
    const q=window.qrcode(0,'M');q.addData(text);q.make();const n=q.getModuleCount(),c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');
    g.fillStyle=bg||'#fff';g.fillRect(0,0,size,size);const pad=Math.round(size*.06),cell=(size-pad*2)/n;g.fillStyle=fg||'#1C1B30';
    for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))g.fillRect(Math.round(pad+k*cell),Math.round(pad+r*cell),Math.ceil(cell),Math.ceil(cell));return c};

  // ---- share card ----
  const INK='#1C1B30',PINK='#FF3D8B',BLUE='#2E4BFF',YOLK='#FFD23F',PAPER='#F6F6F0';
  function wrapText(g,t,x,y,w,lh){const words=t.split(' ');let line='',yy=y;for(const wd of words){const test=line?line+' '+wd:wd;if(g.measureText(test).width>w&&line){g.fillText(line,x,yy);line=wd;yy+=lh}else line=test}if(line)g.fillText(line,x,yy);return yy}
  S.shareCard=async function(rec,shot,fmt){
    try{if(document.fonts){await Promise.race([Promise.all(['80px Bungee','700 30px Archivo','600 30px "IBM Plex Mono"'].map(f=>document.fonts.load(f))),new Promise(r=>setTimeout(r,2000))])}}catch(e){}
    const W=1080,H=fmt==='post'?1350:1920,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
    const FD='"Bungee","Impact","Arial Black",sans-serif',FB='"Archivo","Helvetica Neue",Arial,sans-serif',FM='"IBM Plex Mono",ui-monospace,monospace';
    g.fillStyle='#E4E6DD';g.fillRect(0,0,W,H);
    for(let i=0;i<9000;i++){g.fillStyle=Math.random()<.5?'rgba(28,27,48,.05)':'rgba(255,255,255,.25)';g.fillRect(Math.random()*W,Math.random()*H,2,2)}
    const side=rec.side==='pol'?'POLICE':'PROTESTER',sc=rec.side==='pol'?BLUE:PINK;
    const m=64;let y=fmt==='post'?70:120;
    g.fillStyle=INK;g.font='600 30px '+FM;g.textBaseline='top';g.fillText('NEW DELHI · FOUR OR MORE IS A CROWD',m,y);y+=60;
    let ts=fmt==='post'?132:160;g.font=ts+'px '+FD;while(g.measureText('SECTION 144').width>W-m*2-10&&ts>60){ts-=4;g.font=ts+'px '+FD}
    g.fillStyle=PINK;g.fillText('SECTION 144',m+7,y+6);g.fillStyle=INK;g.fillText('SECTION 144',m,y);y+=fmt==='post'?160:200;
    // screenshot frame
    const fw=W-m*2,fh=fmt==='post'?440:620;
    g.fillStyle=sc;g.fillRect(m+14,y+14,fw,fh);g.fillStyle=INK;g.fillRect(m-5,y-5,fw+10,fh+10);
    if(shot){const iw=shot.width,ih=shot.height,s=Math.max(fw/iw,fh/ih),dw=iw*s,dh=ih*s;g.save();g.beginPath();g.rect(m,y,fw,fh);g.clip();g.drawImage(shot,m+(fw-dw)/2,y+(fh-dh)/2,dw,dh);g.restore()}
    else{g.fillStyle='#cfc8bb';g.fillRect(m,y,fw,fh)}
    g.save();g.translate(m+fw-30,y+30);g.rotate(.06);g.font='44px '+FD;const tw=g.measureText(side).width;g.fillStyle=INK;g.fillRect(-tw-34+6,-6+6,tw+40,70);g.fillStyle=sc;g.fillRect(-tw-34,-6,tw+40,70);g.fillStyle=rec.side==='pol'?PAPER:INK;g.textAlign='left';g.fillText(side,-tw-14,6);g.restore();
    y+=fh+(fmt==='post'?50:80);
    g.fillStyle=INK;g.font='600 34px '+FM;g.fillText('I HELD OUT',m,y);y+=46;
    g.font=(fmt==='post'?190:230)+'px '+FD;g.fillText(rec.seconds.toFixed(1),m,y);const tw2=g.measureText(rec.seconds.toFixed(1)).width;g.font='90px '+FD;g.fillText('s',m+tw2+12,y+(fmt==='post'?82:112));
    y+=fmt==='post'?210:260;
    const cards=[['PEAK CROWD',String(rec.peak)],[rec.side==='pol'?'GROUPS DISPERSED':'RIVALS OUTRUN',String(rec.broken||0)],['BOARD RANK',rec.rank?('#'+rec.rank):'-']];
    const cw=(W-m*2-40)/3;cards.forEach(([k,v],i)=>{const x=m+i*(cw+20);g.fillStyle=INK;g.fillRect(x+6,y+6,cw,130);g.fillStyle=PAPER;g.fillRect(x,y,cw,130);g.strokeStyle=INK;g.lineWidth=5;g.strokeRect(x,y,cw,130);
      g.fillStyle='#5B5E70';g.font='600 22px '+FM;g.fillText(k,x+20,y+20);g.fillStyle=INK;g.font='58px '+FD;g.fillText(v,x+20,y+52)});
    y+=180;
    // footer: QR + link
    const qs=fmt==='post'?200:240,qy=H-qs-(fmt==='post'?60:120),qx=W-m-qs;
    g.fillStyle=INK;g.fillRect(qx+8,qy+8,qs,qs);g.drawImage(S.qrCanvas(S.challengeUrl(rec),qs,INK,'#ffffff'),qx,qy);
    g.fillStyle=YOLK;g.fillRect(m,qy,qx-m-30,qs);g.strokeStyle=INK;g.lineWidth=5;g.strokeRect(m,qy,qx-m-30,qs);
    g.fillStyle=INK;g.font='54px '+FD;g.fillText('BEAT ME.',m+28,qy+26);g.font='700 30px '+FB;wrapText(g,'Scan or tap the link to play. Pick a side, grow your crowd, hold the streets.',m+28,qy+96,qx-m-90,38);
    g.font='600 26px '+FM;g.fillStyle=INK;g.fillText(S.prettyUrl(),m,qy+qs+22);
    g.fillStyle='#5B5E70';g.font='600 22px '+FM;g.textAlign='right';g.fillText("A NOBODY'S BUSINESS DROP",W-m,qy+qs+26);g.textAlign='left';
    return c;
  };
  S.shareFile=async function(canvas,name){const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));return new File([blob],name,{type:'image/png'})};
  S.canShareFiles=function(){try{const f=new File([new Blob(['x'])],'x.png',{type:'image/png'});return!!(navigator.canShare&&navigator.canShare({files:[f]}))}catch(e){return false}};
  S.download=function(file){const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)};
  S.copy=async function(text){try{await navigator.clipboard.writeText(text);return true}catch(e){const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();let ok=false;try{ok=document.execCommand('copy')}catch(_){}t.remove();return ok}};
  // Share flow used by both the game and the phone controller.
  // Cards are prepared right after game over so the tap can open the share sheet immediately.
  S.prepareShare=async function(rec,shot){
    const url=S.challengeUrl(rec),text=`I held out ${rec.seconds.toFixed(1)}s as ${rec.side==='pol'?'Police':'a Protester'} in Section 144. Beat me: ${url}`;
    const [story,post]=await Promise.all(['story','post'].map(async f=>S.shareFile(await S.shareCard(rec,shot,f),`section-144-${f}-${rec.seconds.toFixed(1)}s.png`)));
    return{rec,url,text,story,post};
  };
  S.share=async function(prep,fmt,statusEl){
    const say=t=>{if(statusEl)statusEl.textContent=t};
    if(!prep){say('Your card is still being made. Try again in a second.');return}
    const file=fmt==='post'?prep.post:prep.story;
    if(S.canShareFiles()){
      S.copy(prep.url);
      try{await navigator.share({files:[file],title:'Section 144',text:prep.text});say(fmt==='post'?'Shared. Your challenge link is copied: paste it in the caption or your bio.':'Shared. Your challenge link is copied: add it with the link sticker on your story.');return}
      catch(e){if(e&&e.name==='AbortError'){say('');return}}
    }
    S.download(file);const ok=await S.copy(prep.url);
    say(ok?'Card saved and challenge link copied. Post the image on Instagram, then paste the link in your story sticker or bio.':'Card saved. Challenge link: '+prep.url);
  };
  window.S144=S;
})();
