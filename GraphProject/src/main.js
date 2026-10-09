import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import "./style.css";

const DATA_BASE = `${import.meta.env.BASE_URL}data/`;
const $ = (selector) => document.querySelector(selector);
const state = {
  nodes: [], nodeById: new Map(), audienceEdges: [], relationEdges: [],
  graph: new Graph({ type: "undirected", multi: false }), renderer: null,
  selected: null, mode: "audience", showLabels: true, colorCommunity: false,
  minAudience: 0, maxAudience: 0,
};
const palette = ["#69b7ff","#ff9b71","#72d6a0","#d39cff","#ffd166","#f47ca4","#8de0df","#b6c17b","#a4a9ff","#e2a66d","#79a8a0","#d18cce","#8eb7e8","#d0c18a","#a6d78c"];
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function num(v){return Number.isFinite(Number(v))?Number(v):0;}
function fmt(v){return num(v).toLocaleString();}
function img(node){return node.image||"";}
function color(node){return state.colorCommunity&&node.community_id!=null&&node.community_id>=0?palette[node.community_id%palette.length]:"#69b7ff";}
function nodeSize(node) {
  const a = Math.max(1, num(node.audience_size));
  const max = Math.max(1, state.maxAudience);
  return 1.5 + 4.5 * Math.log1p(a) / Math.log1p(max);   // 1.5 → 6px
}
function layoutAudienceGraph() {
  const layoutGraph = new Graph({ type: "undirected" });

  for (const n of state.nodes) {
    layoutGraph.addNode(String(n.id), { x: num(n.x), y: num(n.y) });
  }

  for (const e of state.audienceEdges) {
    const a = String(e.source), b = String(e.target);
    if (a === b || !layoutGraph.hasNode(a) || !layoutGraph.hasNode(b)) continue;
    if (layoutGraph.hasEdge(a, b)) continue;
    const raw = Math.max(0.01, num(e.cosine ?? e.weight));
    layoutGraph.addEdgeWithKey(`${a}:${b}`, a, b, { weight: Math.pow(raw, 2) });
  }

  const byCommunity = new Map();
  for (const n of state.nodes) {
    const c = n.community_id;
    if (c == null || c < 0) continue;
    if (!byCommunity.has(c)) byCommunity.set(c, []);
    byCommunity.get(c).push(String(n.id));
  }
  const HOMOPHILY = 0.03;
  for (const [, members] of byCommunity) {
    if (members.length < 2 || members.length > 300) continue;
    const anchor = members[0];
    for (let i = 1; i < members.length; i++) {
      const a = anchor, b = members[i];
      if (a === b || layoutGraph.hasEdge(a, b)) continue;
      layoutGraph.addEdgeWithKey(`c:${a}:${b}`, a, b, { weight: HOMOPHILY });
    }
  }

  $("#notice").textContent =
    `Calculating audience layout for ${fmt(layoutGraph.order)} anime…`;

  const layout = new FA2Layout(layoutGraph, {
    settings: {
      ...forceAtlas2.inferSettings(layoutGraph),
      linLogMode: true,
      adjustSizes: false,
      edgeWeightInfluence: 2,
      scalingRatio: 30,
      gravity: 0.3,
      strongGravityMode: false,
      outboundAttractionDistribution: true,
      barnesHutOptimize: true,
      barnesHutTheta: 0.8,
      slowDown: 1,
    },
  });

  layout.start();

  setTimeout(() => {
    if (layout.isRunning && layout.isRunning()) layout.stop();
    for (const n of state.nodes) {
      const a = layoutGraph.getNodeAttributes(String(n.id));
      n.x = a.x;
      n.y = a.y;
    }
    $("#notice").textContent =
      "Layout ready. Select an anime to explore its connections.";
    rebuildGraph();
  }, 2500);
}
function visible(node){return num(node.audience_size)>=state.minAudience;}
function edgesForMode(){return state.mode==="relations"?state.relationEdges:state.mode==="both"?[...state.audienceEdges,...state.relationEdges]:state.audienceEdges;}
function edgeAttrs(edge) {
  if (edge.kind === "relation") {
    return {
      color: "#f3b65e",
      size: 1.5,
      type: "line",
      kind: "relation",
      label: edge.label || "Tenrai relation",
      shared_users: 0,
      jaccard: 0,
      cosine: 0,
      weight: 0.3,
    };
  }
  const w = Math.min(1, Math.max(0, num(edge.cosine ?? edge.weight)));
  const t = Math.pow(w, 0.6);
  const r = Math.round(70 + (105 - 70) * t);
  const g = Math.round(90 + (183 - 90) * t);
  const b = Math.round(120 + (255 - 120) * t);
  return {
    color: `rgb(${r},${g},${b})`,
    size: 0.3 + Math.min(2.2, Math.pow(w, 0.7) * 4),
    type: "line",
    kind: "audience",
    shared_users: num(edge.shared_users),
    jaccard: num(edge.jaccard),
    cosine: num(edge.cosine),
    weight: w,
  };
}
const LABEL_LIMIT = 40;

function rebuildGraph(focusId = state.selected) {
  const graph = new Graph({ type: "undirected", multi: false });
  const shown = state.nodes.filter(visible);
  const topIds = new Set(
    shown
      .slice()
      .sort((a, b) => num(b.audience_size) - num(a.audience_size))
      .slice(0, LABEL_LIMIT)
      .map((n) => String(n.id))
  );

  for (const n of shown) {
    const id = String(n.id);
    graph.addNode(id, {
      label: state.showLabels && topIds.has(id) ? n.title : "",
      x: num(n.x),
      y: num(n.y),
      size: nodeSize(n),
      color: color(n),
      mal_id: n.id,
      audience_size: num(n.audience_size),
      image: img(n),
    });
  }

  for (const e of edgesForMode()) {
    const a = String(e.source);
    const b = String(e.target);
    if (a === b || !graph.hasNode(a) || !graph.hasNode(b) || graph.hasEdge(a, b)) continue;
    graph.addEdgeWithKey(`${e.kind}:${a}:${b}`, a, b, edgeAttrs(e));
  }

  state.graph = graph;
  if (state.renderer) { state.renderer.kill(); state.renderer = null; }

  state.renderer = new Sigma(graph, $("#graph-container"), {
    renderLabels: state.showLabels,
    labelRenderedSizeThreshold: 7,
    labelDensity: 0.08,
    labelGridCellSize: 90,
    defaultNodeColor: "#69b7ff",
    defaultEdgeColor: "#42516a",
    defaultEdgeType: "line",
    zIndex: true,
  });

  state.renderer.on("clickNode", ({ node }) => showDetails(node));
  state.renderer.on("doubleClickNode", ({ node }) => {
    showDetails(node);
    const a = graph.getNodeAttributes(node);
    state.renderer.getCamera().animate({ x: a.x, y: a.y, ratio: 0.25 }, { duration: 500 });
  });
  state.renderer.on("clickStage", () => {
    state.selected = null;
    renderDetails(null);
    highlight();
  });
  state.renderer.getCamera().on("updated", () => {
    if (!state.showLabels) return;
    const ratio = state.renderer.getCamera().ratio;
    state.renderer.setSetting("labelRenderedSizeThreshold", Math.max(3, 14 / ratio));
  });
  if (focusId && graph.hasNode(String(focusId))) showDetails(String(focusId));
  highlight();
  $("#notice").textContent = `${fmt(graph.order)} anime · ${fmt(graph.size)} visible connections`;
}
function highlight() {
  if (!state.renderer) return;

  const selected = state.selected == null ? null : String(state.selected);
  const neighbors = new Set();
  if (selected && state.graph.hasNode(selected)) {
    state.graph.forEachNeighbor(selected, (n) => neighbors.add(n));
  }

  $("#graph-container").classList.toggle("is-focused", !!selected);

  state.renderer.setSetting("nodeReducer", (node, attrs) => {
    if (!selected) return attrs;
    if (node === selected) {
      return { ...attrs, highlighted: true, size: num(attrs.size) * 1.6, color: "#ffffff", label: attrs.label };
    }
    if (neighbors.has(node)) {
      return { ...attrs, highlighted: true };
    }
    return { ...attrs, label: "" };
  });

  state.renderer.setSetting("edgeReducer", (edge, attrs) => {
    if (!selected) return attrs;
    const a = state.graph.source(edge);
    const b = state.graph.target(edge);
    if (a === selected || b === selected) {
      return {
        ...attrs,
        color: attrs.kind === "relation" ? "#ffd17a" : "#8ecaff",
        size: Math.max(num(attrs.size), 2),
      };
    }
    return { ...attrs, color: "#242b38" };
  });
}
function showDetails(id){const n=state.nodeById.get(String(id));if(!n)return;state.selected=String(id);renderDetails(n);highlight();}
//Dont look its disgusting
function renderDetails(n){
  const el=$("#details");
  if(!n){el.className="details empty";el.textContent="Select a node to inspect its audience connections and Tenrai metadata.";return;}
  const neighbors=[];
  if(state.graph.hasNode(String(n.id)))state.graph.forEachEdge(String(n.id),(edge,attrs,a,b)=>{
    const otherId=a===String(n.id)?b:a,other=state.nodeById.get(otherId);if(!other)return;
    neighbors.push({node:other,kind:attrs.kind,weight:num(attrs.weight),shared:num(attrs.shared_users),relation:attrs.label||""});
  });
  neighbors.sort((a,b)=>(b.kind==="audience")-(a.kind==="audience")||b.weight-a.weight||b.shared-a.shared);
  const image=img(n),syn=n.synopsis||"";
  el.className="details";
  el.innerHTML=`<div class="detail-heading">${image?`<img src="${esc(image)}" alt="" loading="lazy">`:""}<div><h2>${esc(n.title)}</h2>${n.title_english&&n.title_english!==n.title?`<div><small>${esc(n.title_english)}</small></div>`:""}<small>MAL ID ${esc(n.id)} · ${esc(n.type||"Unknown type")}</small><div><a href="https://myanimelist.net/anime/${encodeURIComponent(n.id)}" target="_blank" rel="noreferrer">Open on MyAnimeList ↗</a></div></div></div>
  <div class="pills">${[...(n.genres||[]),...(n.themes||[])].map(x=>`<span class="pill">${esc(x)}</span>`).join("")}</div>
  <div class="detail-block"><strong>Audience graph</strong><p>Audience size: ${fmt(n.audience_size)}<br>MAL score: ${n.score==null?"N/A":esc(n.score)}<br>Visible audience links: ${neighbors.filter(x=>x.kind==="audience").length}</p></div>
  ${n.studios?.length?`<div class="detail-block"><strong>Studios</strong><p>${n.studios.map(esc).join(", ")}</p></div>`:""}
  ${n.producers?.length?`<div class="detail-block"><strong>Producers</strong><p>${n.producers.map(esc).join(", ")}</p></div>`:""}
  ${n.source?`<div class="detail-block"><strong>Source</strong><p>${esc(n.source)}</p></div>`:""}
  ${n.year?`<div class="detail-block"><strong>Year</strong><p>${esc(n.year)} ${n.season?`· ${esc(n.season)}`:""}</p></div>`:""}
  ${syn?`<div class="detail-block"><strong>Synopsis</strong><p>${esc(syn.slice(0,650))}${syn.length>650?"…":""}</p></div>`:""}
  <div class="detail-block"><strong>Connections</strong><div class="neighbor-list">${neighbors.slice(0,18).map(x=>`<button class="neighbor" data-neighbor="${esc(x.node.id)}"><span>${esc(x.node.title)}${x.kind==="relation"?` · ${esc(x.relation)}`:""}</span><span>${x.kind==="audience"?`${fmt(x.shared)} shared`:"Relation"}</span></button>`).join("")||"<p>No visible connections under current filters.</p>"}</div></div>
  ${(n.relations||[]).length?`<div class="detail-block"><strong>Tenrai relations</strong><p>${n.relations.slice(0,10).map(r=>`${esc(r.relation)}: ${esc(r.title)}`).join("<br>")}</p></div>`:""}`;
  el.querySelectorAll("[data-neighbor]").forEach(btn=>btn.addEventListener("click",()=>{
    const id=btn.dataset.neighbor;
    if(state.graph.hasNode(String(id))){showDetails(id);const a=state.graph.getNodeAttributes(String(id));state.renderer.getCamera().animate({x:a.x,y:a.y,ratio:.22},{duration:450});}
    else $("#notice").textContent="That anime is filtered out. Lower the minimum audience filter to show it.";
  }));
}
function searchResults(query){
  const el=$("#search-results");el.innerHTML="";if(!query.trim())return;
  const q=query.trim().toLowerCase();
  const matches=state.nodes.filter(n=>String(n.id)===q||String(n.title||"").toLowerCase().includes(q)||String(n.title_english||"").toLowerCase().includes(q)||String(n.title_japanese||"").toLowerCase().includes(q)).slice(0,12);
  for(const n of matches){
    const b=document.createElement("button");b.className="search-result";const image=img(n);
    b.innerHTML=`${image?`<img src="${esc(image)}" alt="" loading="lazy">`:""}<span class="title">${esc(n.title)}<small>MAL ${esc(n.id)} · audience ${fmt(n.audience_size)}</small></span>`;
    b.addEventListener("click",()=>{
      if(!visible(n)){state.minAudience=0;$("#min-audience").value="0";$("#audience-label").textContent="No filter";rebuildGraph(String(n.id));}
      else showDetails(String(n.id));
      const a=state.graph.getNodeAttributes(String(n.id));state.renderer.getCamera().animate({x:a.x,y:a.y,ratio:.22},{duration:500});el.innerHTML="";
    });el.appendChild(b);
  }
}
function setAudienceFilter(v){
  const n=Number(v);state.minAudience=n<=0?0:Math.round(Math.pow(n/100,2)*state.maxAudience);
  $("#audience-label").textContent=state.minAudience?`≥ ${fmt(state.minAudience)}`:"No filter";rebuildGraph();
}
function seedPositions() {
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const N = Math.max(1, state.nodes.length);
  state.nodes.forEach((n, i) => {
    const r = Math.sqrt((i + 0.5) / N);
    const a = i * GOLDEN;
    n.x = Math.cos(a) * r * 100;
    n.y = Math.sin(a) * r * 100;
  });
}

async function loadData(){
  const responses=await Promise.all(["nodes.json","edges.json","relations.json"].map(name=>fetch(`${DATA_BASE}${name}`)));
  if(responses.some(r=>!r.ok))throw new Error("Graph data files are missing. Run scripts/export_graph.py first.");
  state.nodes=await responses[0].json();state.audienceEdges=(await responses[1].json()).map(e=>({...e,kind:"audience"}));state.relationEdges=(await responses[2].json()).map(e=>({...e,kind:"relation"}));
  state.nodeById=new Map(state.nodes.map(n=>[String(n.id),n]));
state.maxAudience = Math.max(1, ...state.nodes.map(n => num(n.audience_size)));

seedPositions();
layoutAudienceGraph();
  $("#stats").textContent=`${fmt(state.nodes.length)} anime · ${fmt(state.audienceEdges.length)} audience edges · ${fmt(state.relationEdges.length)} relations`;
  $("#notice").textContent=`Loaded ${fmt(state.nodes.length)} anime. Search a title or select a node.`;
  rebuildGraph();
}
$("#search").addEventListener("input",e=>searchResults(e.target.value));
$("#show-labels").addEventListener("change",e=>{state.showLabels=e.target.checked;rebuildGraph();});
$("#color-community").addEventListener("change",e=>{state.colorCommunity=e.target.checked;rebuildGraph();});
$("#min-audience").addEventListener("input",e=>setAudienceFilter(e.target.value));
document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{state.mode=b.dataset.mode;document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("active",x===b));rebuildGraph();}));
loadData().catch(e=>{$("#notice").textContent=e.message;$("#stats").textContent="Graph data not loaded";});
