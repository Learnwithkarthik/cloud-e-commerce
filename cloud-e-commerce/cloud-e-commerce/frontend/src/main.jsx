import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Search, ShoppingBag, ArrowRight, ArrowUpRight, Menu, X, Minus, Plus, Check, ShieldCheck, Truck, Headphones, Zap, SlidersHorizontal, RefreshCw } from 'lucide-react';
import './styles.css';

const money = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v));
const categories = ['All products', 'Audio', 'Wearables', 'Accessories', 'Electronics'];

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [category, setCategory] = useState('All products');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [customer, setCustomer] = useState({ name: '', email: '' });
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  async function loadProducts() {
    setLoading(true); setLoadError('');
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProducts(await res.json());
    } catch (e) { setLoadError(`Unable to load products (${e.message}).`); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadProducts(); }, []);
  const filtered = useMemo(() => products.filter(p =>
    (category === 'All products' || p.category === category) &&
    `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  ), [products, category, search]);
  const items = products.filter(p => cart[p.id]).map(p => ({...p, quantity: cart[p.id]}));
  const cartCount = items.reduce((n,p) => n + p.quantity, 0);
  const subtotal = items.reduce((n,p) => n + p.quantity * p.price, 0);
  function updateCart(p, delta) {
    setCart(prev => {
      const quantity = Math.max(0, Math.min(p.stock, (prev[p.id] || 0) + delta));
      const next = {...prev}; if (quantity === 0) delete next[p.id]; else next[p.id] = quantity;
      return next;
    });
  }
  async function submitOrder(e) {
    e.preventDefault(); if (!items.length || placing) return;
    setPlacing(true); setMessage(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: customer.name, customer_email: customer.email, items: items.map(p => ({product_id:p.id, quantity:p.quantity})) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Please verify your details and stock.');
      setCart({}); setCheckout(false); setCartOpen(false);
      setMessage({type:'success', text:`Demo order #${data.order_id} placed! Total: ${money(data.total)}. No payment was collected.`});
      await loadProducts();
    } catch (e) { setMessage({type:'error', text:e.message}); }
    finally { setPlacing(false); }
  }
  const shopNow = () => document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'});

  return <>
    <div className="announcement">A smarter way to shop — discover curated essentials <ArrowRight size={13} /></div>
    <header className="topbar"><div className="container header-inner">
      <a href="/" className="brand"><span className="brand-icon"><ShoppingBag size={19} strokeWidth={2.5}/></span><span>cloud<span className="brand-accent">cart</span><small>AI-READY COMMERCE</small></span></a>
      <nav className={mobileNav ? 'nav open' : 'nav'}><a onClick={()=>setMobileNav(false)} href="#catalog">Shop</a><a onClick={()=>setMobileNav(false)} href="#benefits">Why CloudCart</a><a onClick={()=>setMobileNav(false)} href="#about">About</a></nav>
      <div className="header-actions"><span className="desktop-caption">Designed for what's next.</span><button className="icon-button cart-trigger" aria-label="Open cart" onClick={()=>setCartOpen(true)}><ShoppingBag size={21}/>{cartCount>0&&<b>{cartCount}</b>}</button><button aria-label="Toggle menu" className="icon-button mobile-menu" onClick={()=>setMobileNav(x=>!x)}><Menu size={22}/></button></div>
    </div></header>

    <main>
      <section className="hero"><div className="container hero-grid"><div className="hero-copy">
        <span className="eyebrow"><span className="live-dot"/> THE NEXT GENERATION OF EVERYDAY TECH</span>
        <h1>Tech that fits<br/>your <em>everyday.</em></h1>
        <p>Beautifully useful gadgets, picked for the way you work, create, and live. Find your next favorite thing.</p>
        <div className="hero-actions"><button className="btn btn-dark" onClick={shopNow}>Explore collection <ArrowUpRight size={18}/></button><span className="hero-note"><ShieldCheck size={18}/> Curated with care</span></div>
        <div className="hero-social"><div className="avatars"><span>👩🏽</span><span>👨🏻</span><span>👩🏻</span></div><div><strong>Made for curious minds</strong><small>A real-world cloud-native demo</small></div></div>
      </div><div className="hero-art" aria-hidden="true"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-big-emoji">🎧</div><div className="art-floating floating-top"><Zap size={16}/> Smarter picks</div><div className="art-floating floating-bottom"><span>✦</span> Everyday upgrades</div><div className="art-index">01 / DISCOVER</div></div></div></section>

      <section className="benefits" id="benefits"><div className="container benefit-grid"><div><Truck size={22}/><span><strong>Discovery made easy</strong><small>Curated product collections</small></span></div><div><ShieldCheck size={22}/><span><strong>Simple, safe demo</strong><small>No real payments involved</small></span></div><div><Headphones size={22}/><span><strong>Built for learning</strong><small>Explore cloud-native systems</small></span></div></div></section>

      <section id="catalog" className="catalog container"><div className="section-heading"><div><span className="eyebrow light">THE COLLECTION</span><h2>Find your next favorite.</h2><p>Good tech. Great everyday moments.</p></div><div className="result-count">{filtered.length} thoughtfully selected products <SlidersHorizontal size={16}/></div></div>
      <div className="catalog-toolbar"><div className="filters">{categories.map(c=><button key={c} className={category===c ? 'filter active':'filter'} onClick={()=>setCategory(c)}>{c}</button>)}</div><label className="searchbox"><Search size={18}/><input aria-label="Search products" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products..."/></label></div>
      {loadError&&<div className="notice error">{loadError} <button onClick={loadProducts}><RefreshCw size={15}/> Retry</button></div>}
      {loading?<div className="empty">Loading your collection...</div>:filtered.length===0?<div className="empty">No products found. Try another search.</div>:<div className="product-grid">{filtered.map((p,i)=><article className="product" key={p.id}>
        <div className="product-image" style={{background:p.color}}><span className="product-emoji" role="img" aria-label={p.category}>{p.emoji}</span><span className="product-tag">{i%3===0?'POPULAR':'CURATED'}</span></div>
        <div className="product-details"><span className="product-category">{p.category}</span><h3>{p.name}</h3><p>{p.description}</p><div className="product-bottom"><strong>{money(p.price)}</strong><button disabled={!p.stock} className="add-button" onClick={()=>{updateCart(p,1);setCartOpen(true)}} aria-label={`Add ${p.name} to cart`}>{p.stock ? <Plus size={19}/> : 'Sold out'}</button></div><small className={p.stock<10 ? 'stock low':'stock'}>{p.stock ? `${p.stock} in stock` : 'Out of stock'}</small></div>
      </article>)}</div>}
      </section>
      <section id="about" className="about-section"><div className="container about-inner"><div><span className="eyebrow light">BUILT TO LEARN. DESIGNED TO SCALE.</span><h2>More than a storefront.</h2><p>CloudCart is a hands-on teaching project for DevOps, machine learning, MLOps, generative AI, and agentic AI. This first version is a fully functional demo shop.</p></div><div className="about-symbol">✳</div></div></section>
    </main>
    <footer><div className="container footer-content"><span className="footer-brand">cloud<span>cart</span>.</span><p>© {new Date().getFullYear()} CloudCart · Educational demo · No real payments</p><a href="https://github.com/Learnwithkarthik/cloud-e-commerce" target="_blank" rel="noreferrer">View on GitHub <ArrowUpRight size={14}/></a></div></footer>

    {cartOpen&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget){setCartOpen(false);setCheckout(false)}}}><aside className="drawer" role="dialog" aria-modal="true" aria-label="Shopping cart"><div className="drawer-header"><div><span className="eyebrow light">YOUR SELECTION</span><h2>{checkout?'Checkout':'Shopping bag'} <span>({cartCount})</span></h2></div><button className="icon-button" aria-label="Close cart" onClick={()=>{setCartOpen(false);setCheckout(false)}}><X size={22}/></button></div>
    {checkout?<form onSubmit={submitOrder} className="checkout-form"><button type="button" className="backlink" onClick={()=>setCheckout(false)}>← Back to bag</button><p>Enter your details to place a <b>demo order</b>. There is no payment processing.</p><label>Full name<input required minLength="2" maxLength="120" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} placeholder="Your name"/></label><label>Email address<input required type="email" value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})} placeholder="you@example.com"/></label><div className="checkout-total"><span>Total</span><strong>{money(subtotal)}</strong></div>{message?.type==='error'&&<p className="form-error">{message.text}</p>}<button className="btn btn-dark full" type="submit" disabled={placing}>{placing?'Placing order...':'Place demo order'} <ArrowRight size={17}/></button></form>
    :<><div className="drawer-items">{items.length===0?<div className="empty-cart"><ShoppingBag size={45}/><h3>Your bag is empty</h3><p>Discover something you'll love.</p><button className="btn btn-dark" onClick={()=>{setCartOpen(false);shopNow()}}>Shop collection</button></div>:items.map(p=><div className="cart-line" key={p.id}><div className="cart-thumb" style={{background:p.color}}>{p.emoji}</div><div className="cart-line-body"><h3>{p.name}</h3><span>{money(p.price)}</span><div className="quantity"><button aria-label={`Remove one ${p.name}`} onClick={()=>updateCart(p,-1)}><Minus size={14}/></button><b>{p.quantity}</b><button disabled={p.quantity>=p.stock} aria-label={`Add one ${p.name}`} onClick={()=>updateCart(p,1)}><Plus size={14}/></button></div></div><strong>{money(p.price*p.quantity)}</strong></div>)}</div>{items.length>0&&<div className="drawer-bottom"><div className="subtotal"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><small>No payment will be collected. This is an educational demo.</small><button className="btn btn-dark full" onClick={()=>{setCheckout(true);setMessage(null)}}>Continue to checkout <ArrowRight size={18}/></button></div>}</>}
    </aside></div>}
    {message?.type==='success'&&<div className="toast" role="status"><Check size={20}/><span>{message.text}</span><button aria-label="Dismiss" onClick={()=>setMessage(null)}><X size={17}/></button></div>}
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
