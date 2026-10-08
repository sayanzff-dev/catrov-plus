// reveal on scroll
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);const c=e.target.querySelectorAll('[data-count]');c.forEach(count)}}),{threshold:.15});
document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=(i%4)*.08+'s';io.observe(el)});
function count(el){const t=+el.dataset.count;let n=0;const s=()=>{n+=Math.ceil(t/40);if(n>=t){el.textContent=t+'+';return}el.textContent=n;requestAnimationFrame(s)};s()}
// nav
const nav=document.getElementById('nav');
addEventListener('scroll',()=>nav.classList.toggle('solid',scrollY>40),{passive:true});
document.getElementById('yr').textContent=new Date().getFullYear();
// bubbles
const cv=document.getElementById('bubbles'),cx=cv.getContext('2d');let W,H,bs=[];
function size(){W=cv.width=innerWidth;H=cv.height=innerHeight}
size();addEventListener('resize',size);
for(let i=0;i<40;i++)bs.push({x:Math.random()*W,y:Math.random()*H,r:2+Math.random()*7,v:.3+Math.random()*.9,p:Math.random()*6});
(function loop(t){cx.clearRect(0,0,W,H);for(const b of bs){b.y-=b.v;if(b.y<-10){b.y=H+10;b.x=Math.random()*W}
const x=b.x+Math.sin(t/1000+b.p)*12;cx.beginPath();cx.arc(x,b.y,b.r,0,7);cx.strokeStyle='rgba(125,211,252,.35)';cx.fillStyle='rgba(125,211,252,.08)';cx.fill();cx.stroke()}
requestAnimationFrame(loop)})(0);
