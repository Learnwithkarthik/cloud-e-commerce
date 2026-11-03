import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, ShoppingBag, Search, SlidersHorizontal, ArrowRight, ArrowUpRight, Menu, X, Minus, Plus, Check, Truck, ShieldCheck, Package, Sparkles, Bot, Send, RefreshCw, Leaf, Heart, Boxes, CircleHelp, ShoppingCart, ChevronRight, Star, Box, AlertCircle } from 'lucide-react';
import './styles.css';
import {AccountArea,AdminArea} from './commerce.jsx';

const money = v => new Intl.NumberFormat('en-IN', {style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v||0));
const categories=['All products','Audio','Wearables','Accessories','Electronics'];
const photos = {
  'Wireless Headphones':'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=80&auto=format&fit=crop',
  'Smart Watch Pro':'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&q=80&auto=format&fit=crop',
  'Mechanical Keyboard':'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=700&q=80&auto=format&fit=crop',
  'Portable Bluetooth Speaker':'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700&q=80&auto=format&fit=crop',
  'Laptop Stand':'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=700&q=80&auto=format&fit=crop',
  'Digital Camera':'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&q=80&auto=format&fit=crop',
  'Gaming Mouse':'https://images.unsplash.com/photo-1527814050087-3793815479db?w=700&q=80&auto=format&fit=crop',
  'USB-C Docking Hub':'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80&auto=format&fit=crop'
};
const featured=['Wireless Headphones','Smart Watch Pro','Mechanical Keyboard'];
function ProductImage({product, className=''}) {
  const [failed,setFailed]=useState(false);
  const url=photos[product.name];
  return <div className={`photo ${className}`} style={{background:product.color||'#ecf1ec'}}>
    {url&&!failed?<img src={url} alt={product.name} loading="lazy" onError={()=>setFailed(true)}/>:<span className="fallback-emoji" role="img" aria-label={product.name}>{product.emoji||'📦'}</span>}
  </div>;
}
function UserRoundPlaceholder(){return <ShoppingBag size={18}/>;}
function App(){
  const [page,setPage]=useState('shop');
  const [user,setUser]=useState(null);
  useEffect(()=>{fetch('/api/account/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(u=>setUser(u)).catch(()=>{})},[]);
  const [products,setProducts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [category,setCategory]=useState('All products');
  const [search,setSearch]=useState('');
  const [sort,setSort]=useState('featured');
  const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem('cloudshop-cart-v2')||'{}')}catch{return {}}});
  const [cartOpen,setCartOpen]=useState(false);
  const [checkout,setCheckout]=useState(false);
  const [customer,setCustomer]=useState({name:'',email:''});
  useEffect(()=>{if(user)setCustomer({name:user.name,email:user.email})},[user]);
  const [placing,setPlacing]=useState(false);
  const [notice,setNotice]=useState(null);
  const [orders,setOrders]=useState([]); // Only orders placed during this browser session; never aggregate business totals.
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [chat,setChat]=useState([{by:'bot',text:'Hi! I’m the CloudCart demo assistant. Ask about products, delivery, or how this learning project works.'}]);
  const [chatInput,setChatInput]=useState('');
  const [mobileMenu,setMobileMenu]=useState(false);
  useEffect(()=>{localStorage.setItem('cloudshop-cart-v2',JSON.stringify(cart));},[cart]);
  async function refresh(){
    setLoading(true);setError('');
    try{const r=await fetch('/api/products');if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();setProducts(data)}
    catch(e){setError(`Products could not be loaded: ${e.message}`)}finally{setLoading(false)}
  }
  useEffect(()=>{refresh()},[]);
  const filtered=useMemo(()=>{
    const found=products.filter(p=>(category==='All products'||p.category===category)&&`${p.name} ${p.description} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
    if(sort==='price-low')found.sort((a,b)=>a.price-b.price);
    if(sort==='price-high')found.sort((a,b)=>b.price-a.price);
    if(sort==='name')found.sort((a,b)=>a.name.localeCompare(b.name));
    return found;
  },[products,category,search,sort]);
  const items=products.filter(p=>(cart[p.id]||0)>0).map(p=>({...p,quantity:Math.min(cart[p.id],p.stock,20)})).filter(p=>p.quantity>0);
  const count=items.reduce((s,p)=>s+p.quantity,0);
  const total=items.reduce((s,p)=>s+p.quantity*p.price,0);
  const lowStock=products.filter(p=>p.stock<10);
  function updateCart(p,delta){setCart(prev=>{const next={...prev};const amount=Math.max(0,Math.min(20,p.stock,(prev[p.id]||0)+delta));if(amount)next[p.id]=amount;else delete next[p.id];return next})}
  function goToShop(){setPage('shop');setMobileMenu(false);setTimeout(()=>document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'}),80)}
  async function submitOrder(e){
    e.preventDefault();if(!items.length||placing)return;
    setPlacing(true);setNotice(null);
    try{
      const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer_name:customer.name,customer_email:user?user.email:customer.email,items:items.map(p=>({product_id:p.id,quantity:p.quantity}))})});
      const data=await r.json();if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:'Checkout failed. Please check stock and try again.');
      setOrders(prev=>[{id:data.order_id,total:Number(data.total),status:data.status,at:new Date().toLocaleString(),qty:count},...prev]);
      setCart({});setCheckout(false);setCartOpen(false);
      setNotice({type:'success',text:`Demo order #${data.order_id} placed · ${money(data.total)}. No payment was collected.`});
      await refresh();
    }catch(e){setNotice({type:'error',text:e.message})}finally{setPlacing(false)}
  }
  function ask(raw){
    const q=raw.trim();if(!q)return;
    const s=q.toLowerCase();let reply='I can help you explore the available products, stock and demo checkout. I’m a rule-based demo assistant; a real LLM and RAG will be added later.';
    if(s.includes('delivery')||s.includes('shipping'))reply='This is an educational demo store. Shipping and delivery are not connected to a real courier.';
    else if(s.includes('payment')||s.includes('checkout'))reply='You can place demo orders in the cart. No payment gateway is connected and no payment will be collected.';
    else if(s.includes('stock')||s.includes('inventory'))reply=lowStock.length?`Low-stock products: ${lowStock.map(p=>`${p.name} (${p.stock} left)`).join(', ')}.`:'All currently loaded products have at least 10 units in stock.';
    else if(s.includes('recommend')||s.includes('best')||s.includes('popular'))reply=`Try ${products.slice(0,3).map(p=>p.name).join(', ')}. These are sample catalog picks, not ML-powered recommendations yet.`;
    else if(s.includes('ai')||s.includes('mlops')||s.includes('devops'))reply='This application is used for DevOps, ML, MLOps, GenAI and Agentic AI hands-on labs. AI capabilities are planned and are not live in this version.';
    else {const match=products.find(p=>s.includes(p.name.toLowerCase())||p.name.toLowerCase().split(' ').some(w=>w.length>5&&s.includes(w)));if(match)reply=`${match.name}: ${money(match.price)}, ${match.stock} in stock. ${match.description}`}
    setChat(prev=>[...prev,{by:'user',text:q},{by:'bot',text:reply}]);setChatInput('');
  }
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?'open':''}`}>
      <div className="sidebar-top"><button className="brand" onClick={()=>{setPage('shop');setMobileMenu(false)}}><span className="logo-mark"><ShoppingBag size={21}/></span><span>cloudcart<span className="brand-dot">.</span><small>COMMERCE STUDIO</small></span></button><button className="mobile-close" onClick={()=>setMobileMenu(false)} aria-label="Close menu"><X size={21}/></button></div>
      <div className="side-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">
        <button className={page==='shop'?'active':''} onClick={()=>{setPage('shop');setMobileMenu(false)}}><ShoppingBag size={18}/> Storefront <ChevronRight size={15} className="end-icon"/></button>
        <button className={page==='dashboard'?'active':''} onClick={()=>{setPage('dashboard');setMobileMenu(false)}}><LayoutDashboard size={18}/> Dashboard <ChevronRight size={15} className="end-icon"/></button>
        <button className={page==='account'?'active':''} onClick={()=>{setPage('account');setMobileMenu(false)}}><UserRoundPlaceholder/> My account <ChevronRight size={15} className="end-icon"/></button>
        {user?.role==='admin'&&<button className={page==='admin'?'active':''} onClick={()=>{setPage('admin');setMobileMenu(false)}}><ShieldCheck size={18}/> Admin management <ChevronRight size={15} className="end-icon"/></button>}
        <button onClick={()=>{setAssistantOpen(true);setMobileMenu(false)}}><Sparkles size={18}/> AI Assistant <span className="soon">DEMO</span></button>
      </nav>
      <div className="side-label category-label">SHOP BY CATEGORY</div>
      <nav className="side-nav category-nav">{categories.slice(1).map(c=><button key={c} onClick={()=>{setCategory(c);goToShop()}}><span className="category-dot"/> {c}</button>)}</nav>
      <div className="sidebar-bottom"><div className="learning-card"><div className="learning-icon"><Leaf size={18}/></div><strong>Built for learning</strong><p>A real cloud-native demo, ready for the next AI chapter.</p><a href="https://github.com/Learnwithkarthik/cloud-e-commerce" target="_blank" rel="noreferrer">Explore project <ArrowUpRight size={13}/></a></div><small className="sidebar-foot">© {new Date().getFullYear()} CloudCart • V2 UI</small></div>
    </aside>
    {mobileMenu&&<div className="mobile-shade" onClick={()=>setMobileMenu(false)}/>}
    <div className="main-column">
      <header className="app-header"><div className="header-left"><button className="menu-toggle" onClick={()=>setMobileMenu(true)} aria-label="Open navigation"><Menu size={22}/></button><span className="breadcrumb">Workspace <ChevronRight size={15}/> <b>{page==='shop'?'Storefront':page==='dashboard'?'Dashboard':page==='admin'?'Admin management':'My account'}</b></span></div><div className="header-right"><span className="header-hint"><span className="online-dot"/> Learning environment</span><button className="head-search" onClick={goToShop}><Search size={17}/> <span>Explore products</span></button><button className="cart-icon" onClick={()=>setCartOpen(true)} aria-label="Open shopping cart"><ShoppingBag size={19}/>{count>0&&<b>{count}</b>}</button><button className="avatar" title="Open account" onClick={()=>setPage('account')}>{user?user.name.slice(0,1).toUpperCase():'C'}</button></div></header>
      {page==='shop'?<main>
        <div className="content-wrap">
          <section className="welcome"><div><span className="micro-label"><span className="online-dot"/> CURATED TECH FOR YOUR EVERYDAY</span><h1>Discover your next<br/><em>favorite thing.</em></h1><p>Thoughtful tech, beautiful essentials, and everything you need to make everyday better.</p><div className="welcome-actions"><button className="primary-button" onClick={goToShop}>Shop collection <ArrowRight size={17}/></button><span><ShieldCheck size={17}/> Safe demo checkout</span></div></div><div className="hero-visual"><div className="hero-circle circle-a"/><div className="hero-circle circle-b"/><img src={photos['Wireless Headphones']} alt="Featured wireless headphones"/><div className="hero-float"><Star size={15} fill="currentColor"/> Handpicked essentials</div><div className="hero-caption">NEW SEASON / 2026</div></div></section>
          <div className="benefit-row"><div><Truck size={22}/><span><b>Thoughtful selection</b><small>Handpicked everyday essentials</small></span></div><div><ShieldCheck size={22}/><span><b>Demo-first checkout</b><small>No real payments or shipping</small></span></div><div><Package size={22}/><span><b>Real APIs & database</b><small>Built on a cloud-native stack</small></span></div></div>
          <section id="catalog" className="catalog"><div className="section-title"><div><span className="micro-label">SHOP THE COLLECTION</span><h2>Explore our products<span className="title-period">.</span></h2><p>Everyday technology, chosen for you.</p></div><div className="product-number"><Boxes size={16}/>{filtered.length} products</div></div>
          <div className="toolbar"><div className="filter-tabs">{categories.map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="toolbar-right"><label className="filter-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search anything…" aria-label="Search products"/></label><label className="sort"><SlidersHorizontal size={16}/><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label></div></div>
          {error&&<div className="warning"><AlertCircle size={19}/>{error}<button onClick={refresh}><RefreshCw size={15}/> Retry</button></div>}
          {loading?<div className="empty-state">Loading your collection…</div>:filtered.length===0?<div className="empty-state">No matching products. Try another search.</div>:<div className="product-grid">{filtered.map((p,i)=><article className="product-card" key={p.id}><div className="product-photo-wrap"><ProductImage product={p}/><span className="product-badge">{featured.includes(p.name)?'BEST SELLER':'EDITOR’S PICK'}</span><button className="product-favorite" title="Browse favorites coming soon" aria-label="Favorites preview" disabled><Heart size={17}/></button></div><div className="product-info"><div className="product-meta"><span>{p.category}</span><span className="rating"><Star size={12} fill="currentColor"/> Demo</span></div><h3>{p.name}</h3><p>{p.description}</p><div className="price-row"><strong>{money(p.price)}</strong><button className="small-add" disabled={!p.stock} onClick={()=>{updateCart(p,1);setCartOpen(true)}} aria-label={`Add ${p.name} to bag`}>{p.stock?<><Plus size={17}/> Add</>:'Sold out'}</button></div><span className={`availability ${p.stock<10?'limited':''}`}>{p.stock>0?`${p.stock} available`:'Out of stock'}</span></div></article>)}</div>}</section>
          <section className="bottom-promo"><div><span className="micro-label">THE FUTURE OF SHOPPING</span><h2>Commerce meets<br/>intelligent engineering.</h2><p>Explore a real FastAPI, PostgreSQL and Docker project built for hands-on cloud and AI education.</p><button onClick={()=>setAssistantOpen(true)}>Explore assistant demo <ArrowUpRight size={17}/></button></div><div className="promo-art"><Sparkles size={86} strokeWidth={1.1}/><div className="promo-pill">AI READY</div></div></section>
          <footer>© {new Date().getFullYear()} CloudCart · Educational demo only · No real payments <a href="https://github.com/Learnwithkarthik/cloud-e-commerce" target="_blank" rel="noreferrer">Source on GitHub <ArrowUpRight size={13}/></a></footer>
        </div>
      </main>:page==='dashboard'?<main><div className="content-wrap dashboard"><div className="dashboard-heading"><div><span className="micro-label">STORE INTELLIGENCE</span><h1>Store overview<span className="title-period">.</span></h1><p>Live inventory from the Product API. Order activity is limited to this browser session.</p></div><button className="refresh-button" onClick={refresh}><RefreshCw size={15}/> Refresh inventory</button></div>
          <div className="metric-grid"><div className="metric"><div className="metric-icon green"><Box size={22}/></div><span>Products in catalog</span><strong>{products.length}</strong><small>Loaded from FastAPI</small></div><div className="metric"><div className="metric-icon blue"><Boxes size={22}/></div><span>Total stock on hand</span><strong>{products.reduce((s,p)=>s+p.stock,0)}</strong><small>Units across catalog</small></div><div className="metric"><div className="metric-icon orange"><AlertCircle size={22}/></div><span>Low-stock items</span><strong>{lowStock.length}</strong><small>Below 10 units</small></div><div className="metric"><div className="metric-icon purple"><ShoppingCart size={22}/></div><span>Orders this session</span><strong>{orders.length}</strong><small>Browser session only</small></div></div>
          <div className="dash-panels"><section className="panel"><div className="panel-heading"><h2>Inventory health</h2><span>Live product data</span></div>{products.map(p=><div className="inventory-line" key={p.id}><div className="inventory-image"><ProductImage product={p}/></div><div className="inventory-name"><strong>{p.name}</strong><small>{p.category}</small></div><div className="inventory-progress"><div style={{width:`${Math.min(100,p.stock/50*100)}%`}} className={p.stock<10?'low-bar':''}/></div><b>{p.stock}</b></div>)}{!products.length&&<p className="panel-empty">No products loaded yet.</p>}</section><section className="panel"><div className="panel-heading"><h2>Recent demo orders</h2><span>Current session</span></div>{orders.length?orders.map(o=><div className="order-line" key={`${o.id}-${o.at}`}><span className="order-avatar"><ShoppingBag size={17}/></span><div><strong>Order #{o.id}</strong><small>{o.at} • {o.qty} item(s)</small></div><b>{money(o.total)}</b></div>):<div className="order-placeholder"><ShoppingBag size={37}/><h3>No session orders yet</h3><p>Place a demo order from the storefront. It will appear here for this session only.</p><button className="primary-button" onClick={goToShop}>Go shopping <ArrowRight size={16}/></button></div>}<div className="panel-note"><CircleHelp size={16}/><span>This is a teaching dashboard, not a secured production admin panel. Company-wide revenue reporting needs authenticated analytics APIs.</span></div></section></div>
          <footer>Live inventory • Session-only demo orders • No authenticated admin access <button onClick={goToShop}>Back to store <ArrowRight size={14}/></button></footer>
        </div></main>:page==='account'?<main><AccountArea user={user} onUserChange={setUser} onShop={goToShop}/></main>:<main><AdminArea user={user} onShop={goToShop} onInventoryUpdated={refresh}/></main>}
    </div>
    <button className="floating-assistant" onClick={()=>setAssistantOpen(true)}><Sparkles size={20}/> <span>Ask CloudCart</span></button>
    {cartOpen&&<div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget){setCartOpen(false);setCheckout(false)}}}><aside className="drawer" role="dialog" aria-modal="true" aria-label="Shopping bag"><div className="drawer-heading"><div><span className="micro-label">YOUR CART</span><h2>{checkout?'Demo checkout':'Your shopping bag'} <span>({count})</span></h2></div><button className="close-button" aria-label="Close cart" onClick={()=>{setCartOpen(false);setCheckout(false)}}><X size={21}/></button></div>{checkout?<form className="checkout-form" onSubmit={submitOrder}><button type="button" className="back-button" onClick={()=>setCheckout(false)}>← Back to bag</button><div className="checkout-warning"><ShieldCheck size={19}/> Educational demo only. No real payment or shipment.</div><label>Full name<input required minLength="2" maxLength="120" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} placeholder="Your full name"/></label><label>Email address<input required type="email" value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})} placeholder="you@example.com"/></label><div className="drawer-total"><span>Demo order total</span><strong>{money(total)}</strong></div>{notice?.type==='error'&&<div className="form-error">{notice.text}</div>}<button className="primary-button full-width" type="submit" disabled={placing}>{placing?'Processing…':'Place demo order'} <ArrowRight size={18}/></button></form>:<><div className="cart-lines">{!items.length?<div className="empty-bag"><ShoppingBag size={39}/><h3>Your bag is empty</h3><p>Start with something useful.</p><button className="primary-button" onClick={()=>{setCartOpen(false);goToShop()}}>Explore products <ArrowRight size={17}/></button></div>:items.map(p=><div className="cart-item" key={p.id}><ProductImage product={p} className="cart-photo"/><div className="cart-item-detail"><strong>{p.name}</strong><small>{money(p.price)}</small><div className="quantity-controls"><button aria-label={`Remove one ${p.name}`} onClick={()=>updateCart(p,-1)}><Minus size={13}/></button><b>{p.quantity}</b><button aria-label={`Add one ${p.name}`} disabled={p.quantity>=Math.min(p.stock,20)} onClick={()=>updateCart(p,1)}><Plus size={13}/></button></div></div><b>{money(p.price*p.quantity)}</b></div>)}</div>{items.length>0&&<div className="drawer-checkout"><div className="drawer-total"><span>Subtotal</span><strong>{money(total)}</strong></div><p>No real payment will be collected.</p><button className="primary-button full-width" onClick={()=>{setCheckout(true);setNotice(null)}}>Continue to demo checkout <ArrowRight size={17}/></button></div>}</>}</aside></div>}
    {assistantOpen&&<div className="modal-overlay assistant-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setAssistantOpen(false)}}><aside className="assistant-panel" role="dialog" aria-modal="true" aria-label="CloudCart demo assistant"><div className="assistant-heading"><div className="bot-icon"><Sparkles size={21}/></div><div><h2>CloudCart Assistant</h2><span><span className="online-dot"/> Rule-based demo • No LLM connected</span></div><button aria-label="Close assistant" onClick={()=>setAssistantOpen(false)}><X size={20}/></button></div><div className="chat-messages">{chat.map((m,i)=><div className={`chat-message ${m.by}`} key={i}>{m.by==='bot'&&<span className="chat-bot-avatar"><Bot size={15}/></span>}<p>{m.text}</p></div>)}</div><div className="chat-quick">{['Recommend something','Check inventory','How does checkout work?'].map(q=><button key={q} onClick={()=>ask(q)}>{q}</button>)}</div><form className="chat-compose" onSubmit={e=>{e.preventDefault();ask(chatInput)}}><input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Ask a question…" aria-label="Ask assistant"/><button aria-label="Send" type="submit" disabled={!chatInput.trim()}><Send size={18}/></button></form></aside></div>}
    {notice?.type==='success'&&<div role="status" className="toast"><Check size={18}/><span>{notice.text}</span><button onClick={()=>setNotice(null)} aria-label="Dismiss"><X size={16}/></button></div>}
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
