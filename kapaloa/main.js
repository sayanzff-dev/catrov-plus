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
// fin follows pointer and scroll
const fin=document.getElementById('finEl');let px=0,py=0;
addEventListener('pointermove',e=>{px=e.clientX/innerWidth-.5;py=e.clientY/innerHeight-.5},{passive:true});
function fl(){fin.style.transform=`rotateY(${px*28}deg) rotateX(${-py*18}deg) rotateZ(${12+scrollY*.03}deg)`;requestAnimationFrame(fl)}fl();
// bubbles
const cv=document.getElementById('bubbles'),cx=cv.getContext('2d');let W,H;
const bs=Array.from({length:36},()=>({x:Math.random(),y:Math.random(),r:2+Math.random()*9,v:.0006+Math.random()*.0016,p:Math.random()*6}));
function size(){const d=devicePixelRatio||1;W=cv.width=innerWidth*d;H=cv.height=innerHeight*d}size();addEventListener('resize',size);
(function loop(t){cx.clearRect(0,0,W,H);for(const b of bs){b.y-=b.v*(1+scrollY*.0004);if(b.y<-.05){b.y=1.05;b.x=Math.random()}
const x=(b.x+Math.sin(t/1500+b.p)*.01)*W,y=b.y*H,r=b.r*(devicePixelRatio||1);
const g=cx.createRadialGradient(x-r*.35,y-r*.35,r*.1,x,y,r);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(.7,'rgba(180,240,255,.08)');g.addColorStop(1,'rgba(255,255,255,.35)');
cx.beginPath();cx.arc(x,y,r,0,7);cx.fillStyle=g;cx.fill()}requestAnimationFrame(loop)})(0);
