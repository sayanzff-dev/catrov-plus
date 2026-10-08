const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.rv').forEach((el,i)=>{el.style.transitionDelay=(i%5)*.07+'s';io.observe(el)});
document.getElementById('yr').textContent=new Date().getFullYear();
// card tilt + glare
document.querySelectorAll('.tilt').forEach(c=>{
  c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    c.style.transform=`perspective(700px) rotateX(${(.5-y)*10}deg) rotateY(${(x-.5)*12}deg) translateY(-4px)`;
    c.style.setProperty('--mx',x*100+'%');c.style.setProperty('--my',y*100+'%')});
  c.addEventListener('pointerleave',()=>c.style.transform='');
});
// 3D fin built from real product photo: stacked extruded layers + true side profile
const fin=document.getElementById('fin3d'),stage=document.getElementById('stage');
const N=34,T=26; // layers, thickness px
for(let i=0;i<N;i++){const d=document.createElement('div');d.className='ly';const z=(i/(N-1)-.5)*T;
  const edge=Math.abs(i/(N-1)-.5)*2; // 0 centre, 1 faces
  d.style.backgroundImage="url('fin-front.png')";d.style.transform=`translateZ(${z}px)`;
  d.style.filter=i==0||i==N-1?'none':`brightness(${.35+.25*(1-edge)})`;fin.appendChild(d)}
const front=fin.lastChild,back=fin.firstChild;front.style.filter='contrast(1.05)';back.style.filter='brightness(.55)';
const sd=document.createElement('div');sd.className='ly side';sd.style.backgroundImage="url('fin-side.png')";
sd.style.cssText+=';top:0;height:100%;width:'+(177/1253*100)+'%;left:50%;margin-left:-'+(177/1253*50)+'%;aspect-ratio:auto;transform:rotateY(90deg)';fin.appendChild(sd);
// glossy highlight sweeping across the front face
const gl=document.createElement('div');gl.className='ly';gl.style.cssText+=';transform:translateZ('+(T/2+.5)+'px);pointer-events:none;mix-blend-mode:screen;-webkit-mask-image:url(fin-front.png);mask-image:url(fin-front.png);-webkit-mask-size:100% 100%;mask-size:100% 100%;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.45) 48%,transparent 60%);background-size:260% 100%';fin.appendChild(gl);
let ry=-25,rx=12,vy=.25,vx=0,drag=false,lx=0,ly=0,px=0,py=0,t0=performance.now();
stage.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;ly=e.clientY;stage.setPointerCapture(e.pointerId)});
stage.addEventListener('pointerup',()=>drag=false);
stage.addEventListener('pointermove',e=>{if(drag){vy=(e.clientX-lx)*.35;vx=-(e.clientY-ly)*.2;ry+=vy;rx=Math.max(-60,Math.min(60,rx+vx));lx=e.clientX;ly=e.clientY}});
addEventListener('pointermove',e=>{px=e.clientX/innerWidth-.5;py=e.clientY/innerHeight-.5},{passive:true});
(function fl(t){if(!drag){vy+=(.25-vy)*.02;ry+=vy}
 const bob=Math.sin((t-t0)/1100)*10,sc=1+Math.min(scrollY,600)*0;
 fin.style.transform=`translateY(${bob}px) rotateX(${rx+py*14}deg) rotateY(${ry+px*20}deg) rotateZ(${8+Math.sin((t-t0)/2200)*3}deg)`;
 gl.style.backgroundPosition=((t-t0)/18%260-80)+'% 0';
 requestAnimationFrame(fl)})(0);
// bubbles
const cv=document.getElementById('bubbles'),cx=cv.getContext('2d');let W,H;
const bs=Array.from({length:36},()=>({x:Math.random(),y:Math.random(),r:2+Math.random()*9,v:.0006+Math.random()*.0016,p:Math.random()*6}));
function size(){const d=devicePixelRatio||1;W=cv.width=innerWidth*d;H=cv.height=innerHeight*d}size();addEventListener('resize',size);
(function loop(t){cx.clearRect(0,0,W,H);for(const b of bs){b.y-=b.v*(1+scrollY*.0004);if(b.y<-.05){b.y=1.05;b.x=Math.random()}
const x=(b.x+Math.sin(t/1500+b.p)*.01)*W,y=b.y*H,r=b.r*(devicePixelRatio||1);
const g=cx.createRadialGradient(x-r*.35,y-r*.35,r*.1,x,y,r);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(.7,'rgba(180,240,255,.08)');g.addColorStop(1,'rgba(255,255,255,.35)');
cx.beginPath();cx.arc(x,y,r,0,7);cx.fillStyle=g;cx.fill()}requestAnimationFrame(loop)})(0);
