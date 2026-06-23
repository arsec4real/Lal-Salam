"use strict";

(function Animations() {
  const CFG = Object.assign({
    particles:true, ripple:true, confetti:true, cards:true,
    counter:true, cursor:true, pageTrans:true,
    particleCount:35, particleColor:'#f5c842', particleOpacity:.45,
    confettiColors:['#f5c842','#e8a500','#fff8dc','#ffffff','#f5c84288'],
  }, typeof ANIM_CONFIG!=='undefined' ? ANIM_CONFIG : {});

  const reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (reduced) return;

  if (CFG.pageTrans) {
    const c=document.createElement('div');
    Object.assign(c.style,{position:'fixed',inset:'0',zIndex:'9998',
      background:'linear-gradient(135deg,#08090e,#161820)',
      transition:'opacity .6s ease,visibility .6s',opacity:'1',visibility:'visible',pointerEvents:'none'});
    document.body.prepend(c);
    window.addEventListener('load',()=>{
      requestAnimationFrame(()=>{ c.style.opacity='0'; c.style.visibility='hidden';
        setTimeout(()=>c.remove(),650); });
    });
  }

  if (CFG.particles) {
    const canvas=document.createElement('canvas');
    canvas.id='anim-particles';
    Object.assign(canvas.style,{position:'fixed',inset:'0',zIndex:'1',pointerEvents:'none',opacity:String(CFG.particleOpacity)});
    document.body.appendChild(canvas);
    const ctx=canvas.getContext('2d');
    let W,H,ptcls=[],raf;
    function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;}
    resize(); window.addEventListener('resize',resize,{passive:true});
    function hex2rgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
    const [r,g,b]=hex2rgb((CFG.particleColor||'#f5c842').slice(0,7));
    function mkP(){return{x:Math.random()*W,y:Math.random()*H+H,r:Math.random()*2+.8,sp:Math.random()*.4+.15,dx:(Math.random()-.5)*.3,o:Math.random()*.6+.2,p:Math.random()*Math.PI*2};}
    for(let i=0;i<CFG.particleCount;i++){const p=mkP();p.y=Math.random()*H;ptcls.push(p);}
    function draw(){
      ctx.clearRect(0,0,W,H);
      ptcls.forEach(p=>{
        p.y-=p.sp; p.x+=p.dx+Math.sin(p.p)*.15; p.p+=.018;
        if(p.y<-10) Object.assign(p,mkP());
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${r},${g},${b},${p.o})`;ctx.fill();
      });
      raf=requestAnimationFrame(draw);
    }
    draw();
    document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else draw();});
  }

  if (CFG.ripple) {
    const rs=document.createElement('style');
    rs.textContent=`.rh{position:relative;overflow:hidden}.rw{position:absolute;border-radius:50%;background:rgba(245,200,66,.25);transform:scale(0);pointer-events:none;animation:_rip .55s cubic-bezier(.4,0,.2,1) forwards}@keyframes _rip{to{transform:scale(4);opacity:0}}`;
    document.head.appendChild(rs);
    function addRipple(el,e){
      const rect=el.getBoundingClientRect();
      const x=(e.clientX??rect.left+rect.width/2)-rect.left;
      const y=(e.clientY??rect.top+rect.height/2)-rect.top;
      const sz=Math.max(rect.width,rect.height);
      const w=document.createElement('span');w.className='rw';
      Object.assign(w.style,{width:sz+'px',height:sz+'px',left:(x-sz/2)+'px',top:(y-sz/2)+'px'});
      el.appendChild(w);w.addEventListener('animationend',()=>w.remove());
    }
    function attachRipples(){
      document.querySelectorAll('.tab-btn,.btn-auth,.btn-download,.sem-card,.subj-card,.card-action-btn,#ch-send,.btn-admin-send').forEach(el=>{
        if(el.dataset.rip) return; el.dataset.rip='1'; el.classList.add('rh');
        el.addEventListener('pointerdown',e=>addRipple(el,e),{passive:true});
      });
    }
    document.addEventListener('DOMContentLoaded',attachRipples);
    setTimeout(attachRipples,800);
    new MutationObserver(attachRipples).observe(document.body,{childList:true,subtree:true});
  }

  if (CFG.cards) {
    const cs=document.createElement('style');
    cs.textContent=`.card{opacity:0;transform:translateY(22px) scale(.97)}.card.cv{animation:_cIn .4s cubic-bezier(.34,1.2,.64,1) both}@keyframes _cIn{to{opacity:1;transform:translateY(0) scale(1)}}.sem-card{opacity:0;transform:translateY(16px)}.sem-card.cv{animation:_cIn .38s cubic-bezier(.34,1.2,.64,1) both}.subj-card{opacity:0;transform:translateY(14px) scale(.97)}.subj-card.cv{animation:_cIn .35s cubic-bezier(.34,1.2,.64,1) both}`;
    document.head.appendChild(cs);
    const io=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          const el=entry.target;
          const all=[...document.querySelectorAll('.card,.sem-card,.subj-card')];
          el.style.animationDelay=(all.indexOf(el)%10*55)+'ms';
          el.classList.add('cv'); io.unobserve(el);
        }
      });
    },{threshold:.08});
    window.observeCards=function(){
      document.querySelectorAll('.card:not(.cv),.sem-card:not(.cv),.subj-card:not(.cv)').forEach(c=>io.observe(c));
    };
    document.addEventListener('DOMContentLoaded',window.observeCards);
    setTimeout(window.observeCards,400);
    new MutationObserver(window.observeCards).observe(document.body,{childList:true,subtree:true});
  }

  if (CFG.confetti) {
    window.launchConfetti=function(cx,cy,count=55){
      const canvas=document.createElement('canvas');
      Object.assign(canvas.style,{position:'fixed',inset:'0',zIndex:'9997',pointerEvents:'none'});
      canvas.width=window.innerWidth; canvas.height=window.innerHeight;
      document.body.appendChild(canvas);
      const ctx=canvas.getContext('2d');
      const pieces=Array.from({length:count},()=>({
        x:cx,y:cy,vx:(Math.random()-.5)*16,vy:Math.random()*-16-4,
        r:Math.random()*7+4,col:CFG.confettiColors[Math.floor(Math.random()*CFG.confettiColors.length)],
        rot:Math.random()*Math.PI*2,rsp:(Math.random()-.5)*.22,g:.6+Math.random()*.28,o:1,
      }));
      let done=false;
      function tick(){
        ctx.clearRect(0,0,canvas.width,canvas.height); done=true;
        pieces.forEach(p=>{
          p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.rot+=p.rsp;p.o-=.017;
          if(p.o>0){done=false;ctx.save();ctx.globalAlpha=p.o;ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.col;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6);ctx.restore();}
        });
        if(!done)canvas.remove();else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };
  }

  if (CFG.counter) {
    window.animCount=function(el,target,dur=700){
      if(!el) return;
      const start=Date.now(),from=parseInt(el.textContent)||0;
      function tick(){
        const t=Math.min(1,(Date.now()-start)/dur);
        const ease=t<.5?2*t*t:-1+(4-2*t)*t;
        el.textContent=Math.round(from+(target-from)*ease);
        if(t<1)requestAnimationFrame(tick);else el.textContent=target;
      }
      requestAnimationFrame(tick);
    };
  }

  if (CFG.cursor && window.matchMedia('(pointer:fine)').matches) {
    const cs=document.createElement('style');
    cs.textContent=`#acur{position:fixed;pointer-events:none;z-index:9999;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle,rgba(245,200,66,.5) 0%,transparent 70%);transform:translate(-50%,-50%);transition:transform .08s linear,opacity .3s;mix-blend-mode:screen}#acurdot{position:fixed;pointer-events:none;z-index:9999;width:6px;height:6px;border-radius:50%;background:#f5c842;transform:translate(-50%,-50%);mix-blend-mode:screen;transition:transform .06s}`;
    document.head.appendChild(cs);
    const glow=document.createElement('div');glow.id='acur';
    const dot=document.createElement('div');dot.id='acurdot';
    document.body.append(glow,dot);
    let mx=0,my=0,gx=0,gy=0;
    window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;},{passive:true});
    (function loop(){gx+=(mx-gx)*.12;gy+=(my-gy)*.12;glow.style.left=gx+'px';glow.style.top=gy+'px';dot.style.left=mx+'px';dot.style.top=my+'px';requestAnimationFrame(loop);})();
    document.addEventListener('mouseover',e=>{if(e.target.matches('button,a,.card,.sem-card,.subj-card,[role=button],input,textarea')){glow.style.transform='translate(-50%,-50%) scale(2.4)';glow.style.opacity='.8';}});
    document.addEventListener('mouseout', e=>{if(e.target.matches('button,a,.card,.sem-card,.subj-card,[role=button],input,textarea')){glow.style.transform='translate(-50%,-50%) scale(1)';glow.style.opacity='1';}});
  }

  const hio=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.style.animation='fadeSlideUp .5s ease both';e.target.style.opacity='1';hio.unobserve(e.target);}});
  },{threshold:.15});
  document.querySelectorAll('.section-header').forEach(h=>{h.style.opacity='0';hio.observe(h);});

})();