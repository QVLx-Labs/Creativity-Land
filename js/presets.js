// presets.js
import { $ } from './utils.js';
import { swatch } from './color.js';

const LIB = [
  // Warm
  { cat:'Warm', name:'Sunset Glow', colors:['#FF6B6B','#F7B267','#FFD166','#F79D65','#A44A3F'] },
  { cat:'Warm', name:'Autumn Spice', colors:['#7C2D12','#B45309','#D97706','#EA580C','#92400E'] },
  { cat:'Warm', name:'Golden Hour', colors:['#FFB703','#FB8500','#E85D04','#D00000','#6A040F'] },
  { cat:'Warm', name:'Coral Heat', colors:['#FFADAD','#FF6F61','#E63946','#9D0208','#6A040F'] },
  { cat:'Warm', name:'Spicy Fiesta', colors:['#FF4800','#FF5400','#FF6D00','#FF7900','#FF8500'] },
  { cat:'Warm', name:'Firelight', colors:['#FFC300','#FF5733','#C70039','#900C3F','#581845'] },
  { cat:'Warm', name:'Amber Sands', colors:['#FFBA08','#FAA307','#F48C06','#E85D04','#DC2F02'] },
  { cat:'Warm', name:'Vintage Rose', colors:['#FFCDB2','#FFB4A2','#E5989B','#B5838D','#6D6875'] },

  // Cool
  { cat:'Cool', name:'Nordic Sea', colors:['#0EA5E9','#38BDF8','#22D3EE','#34D399','#10B981'] },
  { cat:'Cool', name:'Midnight Blue', colors:['#0B132B','#1C2541','#3A506B','#5BC0BE','#6FFFE9'] },
  { cat:'Cool', name:'Ice Breeze', colors:['#CAF0F8','#ADE8F4','#90E0EF','#48CAE4','#00B4D8'] },
  { cat:'Cool', name:'Mint Wave', colors:['#B7E4C7','#95D5B2','#74C69D','#52B788','#40916C'] },
  { cat:'Cool', name:'Deep Ocean', colors:['#012A4A','#013A63','#01497C','#014F86','#2A6F97'] },
  { cat:'Cool', name:'Winter Night', colors:['#14213D','#1D3557','#457B9D','#A8DADC','#F1FAEE'] },
  { cat:'Cool', name:'Arctic Light', colors:['#E0FBFC','#C2DFE3','#9DB4C0','#5C6B73','#253237'] },

  // Pastel
  { cat:'Pastel', name:'Candy Cloud', colors:['#FFC6FF','#BDB2FF','#A0C4FF','#9BF6FF','#CAFFBF'] },
  { cat:'Pastel', name:'Soft Bloom', colors:['#FDE2E4','#FAD2E1','#E2ECE9','#BEE1E6','#CDE7BE'] },
  { cat:'Pastel', name:'Baby Doll', colors:['#FFD6E0','#E7C6FF','#C8B6FF','#B8C0FF','#BBD0FF'] },
  { cat:'Pastel', name:'Powder Calm', colors:['#FFF1E6','#FDE2E4','#FAD2E1','#E2ECE9','#CDE7BE'] },
  { cat:'Pastel', name:'Mellow Day', colors:['#F1FAEE','#E0FBFC','#FFDDD2','#E29578','#FFB4A2'] },

  // Earth
  { cat:'Earth', name:'Forest Trail', colors:['#2F3E46','#354F52','#52796F','#84A98C','#CAD2C5'] },
  { cat:'Earth', name:'Clay & Moss', colors:['#8D5524','#C68642','#E0AC69','#F1C27D','#6C7A61'] },
  { cat:'Earth', name:'Olive Grove', colors:['#3A5A40','#588157','#A3B18A','#DAD7CD','#344E41'] },
  { cat:'Earth', name:'Sahara Dune', colors:['#A68A64','#BC9A6C','#C2B280','#D6CE93','#EDEAD0'] },
  { cat:'Earth', name:'Stone Path', colors:['#5B5B5B','#767676','#A0A0A0','#C7C7C7','#EAEAEA'] },

  // Neon
  { cat:'Neon', name:'Cyberpop', colors:['#F72585','#B5179E','#7209B7','#3A0CA3','#4361EE'] },
  { cat:'Neon', name:'Laser Beam', colors:['#00F5D4','#00BBF9','#9B5DE5','#F15BB5','#FEE440'] },
  { cat:'Neon', name:'Neon Jungle', colors:['#39FF14','#00E5FF','#FF073A','#FF7F50','#FFD300'] },
  { cat:'Neon', name:'Electric Night', colors:['#FF00FF','#9400D3','#4B0082','#0000FF','#00FFFF'] },

  // Minimal
  { cat:'Minimal', name:'Grayscale', colors:['#111827','#374151','#6B7280','#D1D5DB','#F3F4F6'] },
  { cat:'Minimal', name:'Ink & Paper', colors:['#0B0E14','#1E293B','#94A3B8','#E2E8F0','#FFFFFF'] },
  { cat:'Minimal', name:'Soft Neutral', colors:['#F8F9FA','#E9ECEF','#DEE2E6','#CED4DA','#ADB5BD'] },
  { cat:'Minimal', name:'Charcoal Mist', colors:['#2B2D42','#8D99AE','#EDF2F4','#F8F9FA','#FFFFFF'] },

  // Mono
  { cat:'Mono', name:'Indigo Steps', colors:['#EEF2FF','#E0E7FF','#C7D2FE','#A5B4FC','#818CF8'] },
  { cat:'Mono', name:'Emerald Steps', colors:['#ECFDF5','#D1FAE5','#A7F3D0','#6EE7B7','#34D399'] },
  { cat:'Mono', name:'Ruby Shades', colors:['#FFF0F3','#FFD6DA','#FFB3BA','#FF8B94','#FF5C61'] },
  { cat:'Mono', name:'Ocean Shades', colors:['#E0F7FA','#B2EBF2','#80DEEA','#4DD0E1','#26C6DA'] },

  // Brand
  { cat:'Brand', name:'Tropical', colors:['#264653','#2A9D8F','#E9C46A','#F4A261','#E76F51'] },
  { cat:'Brand', name:'Metro', colors:['#22223B','#4A4E69','#9A8C98','#C9ADA7','#F2E9E4'] },
  { cat:'Brand', name:'Playful', colors:['#FF595E','#FFCA3A','#8AC926','#1982C4','#6A4C93'] },
  { cat:'Brand', name:'Modern', colors:['#1B262C','#0F4C75','#3282B8','#BBE1FA','#F0F5F9'] },

  // Extra categories
  { cat:'Vintage', name:'Old Postcard', colors:['#6B4226','#D9CAB3','#FFE6A7','#E59866','#B5838D'] },
  { cat:'Vintage', name:'Retro Diner', colors:['#F94144','#F3722C','#F9C74F','#90BE6D','#577590'] },
  { cat:'Retro', name:'80s Miami', colors:['#FF71CE','#01CDFE','#05FFA1','#B967FF','#FFFB96'] },
  { cat:'Muted', name:'Dusty Pastel', colors:['#E6C9A8','#C9ADA7','#9A8C98','#6D6875','#4A4E69'] },
  { cat:'Vibrant', name:'Carnival', colors:['#F72585','#FF8500','#FFB703','#0081A7','#00AFB9'] },
  { cat:'Metallic', name:'Gold & Silver', colors:['#FFD700','#E5E4E2','#C0C0C0','#B87333','#DAA520'] },
  { cat:'Nature', name:'Spring Field', colors:['#A7C957','#6A994E','#386641','#F2E8CF','#BC4749'] },
  { cat:'Ocean', name:'Tropical Reef', colors:['#05668D','#028090','#00A896','#02C39A','#F0F3BD'] },
  { cat:'Desert', name:'Canyon', colors:['#D4A373','#E9C46A','#F4A261','#E76F51','#6A4C93'] },
  { cat:'Food', name:'Berry Mix', colors:['#720026','#CE4257','#FF7F51','#FF9B54','#FFD6A5'] },
  { cat:'Seasonal', name:'Winter Frost', colors:['#F0F3F4','#D6EAF8','#AED6F1','#5DADE2','#154360'] },
  { cat:'Seasonal', name:'Autumn Leaves', colors:['#9C6644','#D4A373','#E9C46A','#E76F51','#BC4749'] },
  // ... You can keep adding until you hit 150+ palettes.
];

export function mountPresets(root){
  root.innerHTML = `
    <div class="presets-controls">
      <select id="prCat">
        <option value="All">All Categories</option>
        ${[...new Set(LIB.map(p=>p.cat))].map(c=>`<option>${c}</option>`).join('')}
      </select>
      <input type="text" id="prSearch" placeholder="Search palettes…">
      <button class="btn" id="prShuffle">Shuffle</button>
    </div>
    <div class="presets-grid" id="prGrid"></div>
  `;
  const catSel=$('#prCat',root), search=$('#prSearch',root), grid=$('#prGrid',root), shuffle=$('#prShuffle',root);

  function render(){
    const q=(search.value||'').toLowerCase();
    const cat=catSel.value;
    const list = LIB.filter(p=>{
      const okCat = (cat==='All' || p.cat===cat);
      const okQ = !q || p.name.toLowerCase().includes(q) || p.colors.join('').toLowerCase().includes(q);
      return okCat && okQ;
    });
    grid.innerHTML = '';
    list.forEach(p=>{
      const card=document.createElement('div'); card.className='preset-card'; card.title='Click to apply';
      const title=document.createElement('div'); title.className='preset-title'; title.textContent = p.name;
      const meta=document.createElement('div'); meta.className='preset-meta'; meta.textContent = `${p.cat} • ${p.colors.length} colors`;

      const col=document.createElement('div'); col.className='preset-col';
      p.colors.forEach((hx,i)=>{ col.append(swatch(hx,{big:false,mini:false,isBase:i===0})) });

      card.append(title,col,meta);
      card.addEventListener('click', ()=>{
        const base = p.colors[0];
        const clBase = document.querySelector('#clBase');
        const clGen  = document.querySelector('#clGen');
        const qhBase = document.querySelector('#qhBase');
        if(clBase && clGen){ clBase.value = base; clGen.click(); }
        if(qhBase){ qhBase.value = base; qhBase.dispatchEvent(new Event('input',{bubbles:true})); }
        window.__palette = p.colors.slice();
        navigator.clipboard.writeText(JSON.stringify(p.colors)).catch(()=>{});
      });
      grid.append(card);
    });
  }
  catSel.onchange=render; search.oninput=render;
  shuffle.onclick=()=>{ LIB.sort(()=>Math.random()-0.5); render(); };
  render();
}
